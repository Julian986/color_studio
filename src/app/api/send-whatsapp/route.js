import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { getTwilioClient } from "@/lib/twilio";
import { buildReminderContentVariables } from "@/lib/whatsapp/reminder-content-variables";
import { normalizeToWhatsAppE164 } from "@/lib/whatsapp/twilio-phone";

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
  let fecha = "";
  let hora = "";

  try {
    const body = await request.json();
    to = body?.to ?? "";
    nombre = body?.nombre ?? "";
    fecha = body?.fecha ?? "";
    hora = body?.hora ?? "";

    if (!to || !nombre || !fecha || !hora) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: to, nombre, fecha, hora" },
        { status: 500 },
      );
    }

    const from = process.env.TWILIO_WHATSAPP_FROM;
    const contentSid = process.env.TWILIO_REMINDER_CONTENT_SID;
    if (!from) throw new Error("Falta variable de entorno: TWILIO_WHATSAPP_FROM");
    if (!contentSid) throw new Error("Falta variable de entorno: TWILIO_REMINDER_CONTENT_SID");

    const { contentVariablesJson, templateVariables } = buildReminderContentVariables({
      nombre,
      fecha,
      hora,
    });

    const client = getTwilioClient();
    const response = await client.messages.create({
      from,
      to: normalizeToWhatsAppE164(to),
      contentSid,
      contentVariables: contentVariablesJson,
    });

    const db = await getDb();
    await db.collection("whatsapp_logs").insertOne({
      direction: "outbound",
      to: String(to),
      sid: response.sid,
      status: response.status,
      template: contentSid,
      templateVariables,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, sid: response.sid });
  } catch (error) {
    try {
      if (to) {
        const db = await getDb();
        await db.collection("whatsapp_logs").insertOne({
          direction: "outbound",
          to: String(to),
          sid: null,
          status: "failed",
          template: process.env.TWILIO_REMINDER_CONTENT_SID ?? null,
          templateVariables: { nombre, fecha, hora },
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
