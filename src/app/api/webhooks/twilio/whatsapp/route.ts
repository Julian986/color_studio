import twilio from "twilio";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { parseWaReminderInboundAction } from "@/lib/whatsapp/parse-inbound-action";
import { processWaReminderInboundReply } from "@/lib/whatsapp/process-reminder-reply";
import { buildTwilioWhatsAppSendParams, getTwilioClient } from "@/lib/twilio";

export const runtime = "nodejs";

function getWebhookPublicUrl(request: Request): string {
  const fromEnv = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return `${proto}://${host}/api/webhooks/twilio/whatsapp`;
}

async function parseTwilioForm(request: Request): Promise<Record<string, string>> {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
  return params;
}

function verifyTwilioSignature(request: Request, params: Record<string, string>, url: string): boolean {
  if (process.env.TWILIO_WEBHOOK_SKIP_VERIFY === "true") return true;
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

function emptyTwiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST inbound de Twilio" });
}

export async function POST(request: Request) {
  const url = getWebhookPublicUrl(request);
  const params = await parseTwilioForm(request);

  if (!verifyTwilioSignature(request, params, url)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }

  const action = parseWaReminderInboundAction(params);
  if (!action) {
    return emptyTwiml();
  }

  const from = params.From?.trim();
  if (!from) {
    return emptyTwiml();
  }

  try {
    const db = await getDb();
    const result = await processWaReminderInboundReply(db, {
      action,
      fromWhatsApp: from,
      originalMessageSid: params.OriginalRepliedMessageSid ?? params.ReferredMessageSid ?? null,
      inboundMessageSid: params.MessageSid ?? null,
    });

    if (result.ok && result.replyText && process.env.TWILIO_WHATSAPP_FROM) {
      const client = getTwilioClient();
      const sendParams = await buildTwilioWhatsAppSendParams(client);
      await client.messages.create({
        ...sendParams,
        to: from,
        body: result.replyText,
      });
    }
  } catch (e) {
    console.error("[webhooks/twilio/whatsapp]", e);
  }

  return emptyTwiml();
}
