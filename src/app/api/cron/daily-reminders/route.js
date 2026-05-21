import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { getTwilioClient } from "@/lib/twilio";

const TZ = "America/Argentina/Buenos_Aires";

function normalizeTo(to) {
  // normaliza a +549 para celulares argentinos
  let phone = String(to ?? "").replace(/\D/g, ""); // saca espacios
  if (!phone) throw new Error("reservation.customerPhone inválido");
  if (phone.startsWith("549")) phone = phone;
  else if (phone.startsWith("54")) phone = `549${phone.slice(2)}`;
  else if (phone.startsWith("9")) phone = `54${phone}`;
  else phone = `549${phone}`;

  const toWhatsApp = `whatsapp:+${phone}`;
  return toWhatsApp;
}

function buildTomorrowRangeInArgentina(now = new Date()) {
  const todayKey = formatInTimeZone(now, TZ, "yyyy-MM-dd");
  const noonTodayArt = fromZonedTime(`${todayKey}T12:00:00`, TZ);
  const dateKey = formatInTimeZone(addDays(noonTodayArt, 1), TZ, "yyyy-MM-dd");

  const startUtc = fromZonedTime(`${dateKey}T00:00:00.000`, TZ);
  const endUtc = fromZonedTime(`${dateKey}T23:59:59.999`, TZ);

  return { dateKey, startUtc, endUtc };
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

    if (!process.env.CRON_SECRET || authHeader !== expected) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!process.env.TWILIO_WHATSAPP_FROM) {
      return NextResponse.json(
        { error: "Falta variable de entorno: TWILIO_WHATSAPP_FROM" },
        { status: 500 },
      );
    }

    const { dateKey, startUtc, endUtc } = buildTomorrowRangeInArgentina();
    console.log(
      `Searching reservations between ${startUtc.toISOString()} and ${endUtc.toISOString()} for dateKey ${dateKey}`,
    );
    const db = await getDb();
    const reservationsCol = db.collection("reservations");
    const logsCol = db.collection("whatsapp_logs");
    const client = getTwilioClient();

    const reservations = await reservationsCol
      .find({
        startsAt: { $gte: startUtc, $lte: endUtc },
        reservationStatus: "confirmed",
        paymentStatus: { $in: ["approved", "not_required"] },
        whatsappOptIn: true,
        waReminder24hSentAt: null,
        customerPhone: { $exists: true, $nin: [null, ""] },
      })
      .toArray();

    let sent = 0;
    let errors = 0;

    for (const reservation of reservations) {
      const claimedAt = new Date();
      const claim = await reservationsCol.findOneAndUpdate(
        {
          _id: reservation._id,
          reservationStatus: "confirmed",
          paymentStatus: { $in: ["approved", "not_required"] },
          whatsappOptIn: true,
          waReminder24hSentAt: null,
          customerPhone: { $exists: true, $nin: [null, ""] },
        },
        { $set: { waReminder24hSentAt: claimedAt } },
        { returnDocument: "before" },
      );

      if (!claim) {
        continue;
      }

      try {
        const nombre = reservation.customerName ?? "";
        const servicio = reservation.treatmentName ?? "";
        const fecha = formatInTimeZone(reservation.startsAt, TZ, "dd/MM/yyyy");
        const hora = formatInTimeZone(reservation.startsAt, TZ, "HH:mm");

        const twilioResponse = await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: normalizeTo(reservation.customerPhone),
          contentSid: process.env.TWILIO_REMINDER_CONTENT_SID,
          contentVariables: JSON.stringify({ "1": nombre, "2": servicio, "3": fecha, "4": hora }),
        });

        await logsCol.insertOne({
          to: reservation.customerPhone,
          message: "",
          sid: twilioResponse.sid,
          status: twilioResponse.status,
          template: process.env.TWILIO_REMINDER_CONTENT_SID ?? null,
          templateVariables: { nombre, servicio, fecha, hora },
          createdAt: new Date(),
        });

        sent += 1;
      } catch (error) {
        errors += 1;

        await reservationsCol.updateOne(
          { _id: reservation._id, waReminder24hSentAt: claimedAt },
          { $set: { waReminder24hSentAt: null } },
        );

        await logsCol.insertOne({
          to: reservation.customerPhone ?? null,
          message: "",
          sid: null,
          status: "failed",
          createdAt: new Date(),
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return NextResponse.json({ dateKey, sent, errors });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del cron" },
      { status: 500 },
    );
  }
}
