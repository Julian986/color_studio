import { NextResponse } from "next/server";

import { buildTwilioWhatsAppSendParams, getTwilioClient, resolveTwilioWhatsAppFrom } from "@/lib/twilio";

function maskSid(sid) {
  const s = String(sid ?? "").trim();
  if (s.length < 10) return s || "(vacío)";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function normalizeFromCandidates(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return [];
  const digits = v.replace(/^whatsapp:/i, "").replace(/\D/g, "");
  const out = new Set([v]);
  if (digits) {
    out.add(`whatsapp:+${digits}`);
    out.add(`+${digits}`);
  }
  return [...out];
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const fromConfigured = process.env.TWILIO_WHATSAPP_FROM ?? "";
  const contentSid = process.env.TWILIO_REMINDER_CONTENT_SID ?? "";

  try {
    const client = getTwilioClient();
    const senders = await client.messaging.v2.channelsSenders.list({
      channel: "whatsapp",
      limit: 50,
    });

    const senderRows = senders.map((s) => ({
      senderId: s.senderId ?? null,
      status: s.status ?? null,
      sid: s.sid ?? null,
    }));

    const candidates = normalizeFromCandidates(fromConfigured);
    const matchedSender = senderRows.find((s) => {
      const id = String(s.senderId ?? "").trim();
      return candidates.some((c) => c === id || c === id.replace(/^whatsapp:/i, "whatsapp:+"));
    });

    const onlineSenders = senderRows.filter((s) => String(s.status).toUpperCase() === "ONLINE");

    const resolvedFrom = await resolveTwilioWhatsAppFrom(client);

    return NextResponse.json({
      ok: true,
      hint: "Si matchedSender es null, las credenciales de Vercel no ven el sender que configuraste.",
      accountSid: maskSid(accountSid),
      fromConfigured: fromConfigured || "(vacío)",
      fromResolved: resolvedFrom,
      contentSid: contentSid ? `${contentSid.slice(0, 4)}…${contentSid.slice(-4)}` : "(vacío)",
      fromMatchesOnlineSender: Boolean(matchedSender && String(matchedSender.status).toUpperCase() === "ONLINE"),
      matchedSender: matchedSender ?? null,
      onlineSenders: onlineSenders.map((s) => s.senderId),
      allSenders: senderRows,
      checks: {
        hasAccountSid: Boolean(accountSid.trim()),
        hasAuthToken: Boolean(process.env.TWILIO_AUTH_TOKEN?.trim()),
        hasFrom: Boolean(fromConfigured.trim()),
        hasContentSid: Boolean(contentSid.trim()),
        sendersVisibleToCredentials: senderRows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        accountSid: maskSid(accountSid),
        fromConfigured: fromConfigured || "(vacío)",
        error: error instanceof Error ? error.message : "Error desconocido",
        hint:
          "Si el error menciona 20003 o Authenticate, el Auth Token no corresponde al Account SID. Si sendersVisibleToCredentials es 0, revisá credenciales Live vs Test.",
      },
      { status: 500 },
    );
  }
}
