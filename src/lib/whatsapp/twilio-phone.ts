/** Normaliza teléfono AR a `whatsapp:+549…` para la API de Twilio. */
export function normalizeToWhatsAppE164(to: string): string {
  let phone = String(to ?? "").replace(/\D/g, "");
  if (!phone) throw new Error("Teléfono inválido");
  if (phone.startsWith("549")) {
    // ok
  } else if (phone.startsWith("54")) {
    phone = `549${phone.slice(2)}`;
  } else if (phone.startsWith("9")) {
    phone = `54${phone}`;
  } else {
    phone = `549${phone}`;
  }
  return `whatsapp:+${phone}`;
}

/** De `whatsapp:+549…` a dígitos para cruzar con reservas. */
export function whatsAppFromToDigits(from: string): string {
  return String(from ?? "").replace(/^whatsapp:/i, "").replace(/\D/g, "");
}
