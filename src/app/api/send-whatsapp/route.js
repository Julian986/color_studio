import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { getTwilioClient } from "@/lib/twilio";

function normalizeTo(to) {
  // normaliza a +549 para celulares argentinos
  let phone = String(to ?? "").replace(/\D/g, ""); // saca espacios
  if (!phone) throw new Error("El campo 'to' es obligatorio");
  if (phone.startsWith("549")) phone = phone;
  else if (phone.startsWith("54")) phone = `549${phone.slice(2)}`;
  else if (phone.startsWith("9")) phone = `54${phone}`;
  else phone = `549${phone}`;

  const toWhatsApp = `whatsapp:+${phone}`;
  return toWhatsApp;
}

function methodNotAllowed() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}

export function GET() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return methodNotAllowed();
}

export async function POST(request) {
  let to = "";
  let nombre = "";
  let servicio = "";
  let fecha = "";
  let hora = "";

  try {
    const body = await request.json();
    to = body?.to ?? "";
    nombre = body?.nombre ?? "";
    servicio = body?.servicio ?? "";
    fecha = body?.fecha ?? "";
    hora = body?.hora ?? "";

    if (!to || !nombre || !servicio || !fecha || !hora) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: to, nombre, servicio, fecha, hora" },
        { status: 500 },
      );
    }

    const from = process.env.TWILIO_WHATSAPP_FROM;
    const contentSid = process.env.TWILIO_REMINDER_CONTENT_SID;
    if (!from) throw new Error("Falta variable de entorno: TWILIO_WHATSAPP_FROM");
    if (!contentSid) throw new Error("Falta variable de entorno: TWILIO_REMINDER_CONTENT_SID");

    const client = getTwilioClient();
    const response = await client.messages.create({
      from,
      to: normalizeTo(to),
      contentSid,
      contentVariables: JSON.stringify({
        "1": nombre,
        "2": servicio,
        "3": fecha,
        "4": hora,
      }),
    });

    const db = await getDb();
    await db.collection("whatsapp_logs").insertOne({
      to: String(to),
      sid: response.sid,
      status: response.status,
      template: contentSid,
      templateVariables: { nombre, servicio, fecha, hora },
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, sid: response.sid });
  } catch (error) {
    try {
      if (to) {
        const db = await getDb();
        await db.collection("whatsapp_logs").insertOne({
          to: String(to),
          sid: null,
          status: "failed",
          template: process.env.TWILIO_REMINDER_CONTENT_SID ?? null,
          templateVariables: { nombre, servicio, fecha, hora },
          createdAt: new Date(),
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    } catch {
      // no-op
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar WhatsApp" },
      { status: 500 },
    );
  }
}
