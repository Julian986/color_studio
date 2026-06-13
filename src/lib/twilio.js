import twilio from "twilio";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

let cachedClient = null;

export function getTwilioClient() {
  if (cachedClient) return cachedClient;

  const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = getRequiredEnv("TWILIO_AUTH_TOKEN");

  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

function digitsFromWhatsAppAddress(value) {
  return String(value ?? "")
    .replace(/^whatsapp:/i, "")
    .replace(/\D/g, "");
}

/**
 * Usa el sender_id exacto que devuelve Twilio (evita 63007 por formato).
 * Si las credenciales no ven senders, el error indica cuenta/token incorrectos.
 */
export async function resolveTwilioWhatsAppFrom(client) {
  const configured = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!configured) {
    throw new Error("Falta variable de entorno: TWILIO_WHATSAPP_FROM");
  }

  const targetDigits = digitsFromWhatsAppAddress(configured);
  if (!targetDigits) {
    throw new Error("TWILIO_WHATSAPP_FROM inválido.");
  }

  let senders = [];
  try {
    senders = await client.messaging.v2.channelsSenders.list({
      channel: "whatsapp",
      limit: 50,
    });
  } catch {
    const fallback = configured.startsWith("whatsapp:") ? configured : `whatsapp:+${targetDigits}`;
    return fallback;
  }

  const online = senders.filter((s) => String(s.status ?? "").toUpperCase() === "ONLINE");
  const match =
    online.find((s) => digitsFromWhatsAppAddress(s.senderId) === targetDigits) ??
    senders.find((s) => digitsFromWhatsAppAddress(s.senderId) === targetDigits);

  if (match?.senderId) {
    return String(match.senderId).trim();
  }

  const visible = senders.map((s) => `${s.senderId ?? "?"} (${s.status ?? "?"})`).join("; ");
  throw new Error(
    visible
      ? `TWILIO_WHATSAPP_FROM no coincide con senders de esta cuenta. Configurado: ${configured}. Visibles: ${visible}`
      : `Esta cuenta no tiene senders WhatsApp (Account SID ${String(process.env.TWILIO_ACCOUNT_SID ?? "").slice(0, 6)}…). Usá credenciales Live de la cuenta donde el sender está Online.`,
  );
}

/** Parámetros de envío: Messaging Service (si existe) o From resuelto vía Senders API. */
export async function buildTwilioWhatsAppSendParams(client) {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (messagingServiceSid) {
    return { messagingServiceSid };
  }
  return { from: await resolveTwilioWhatsAppFrom(client) };
}
