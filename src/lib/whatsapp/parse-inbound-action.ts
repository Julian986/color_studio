export type WaReminderInboundAction = "confirm" | "cancel";

/** Interpreta botón o texto de respuesta al recordatorio. */
export function parseWaReminderInboundAction(fields: Record<string, string>): WaReminderInboundAction | null {
  const parts = [
    fields.ButtonPayload,
    fields.ButtonText,
    fields.Body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (!parts.trim()) return null;

  if (/\bcancel/.test(parts) || parts.includes("cancelar")) return "cancel";
  if (/\bconfirm/.test(parts) || parts.includes("confirmar") || parts === "si" || parts === "sí") {
    return "confirm";
  }

  return null;
}
