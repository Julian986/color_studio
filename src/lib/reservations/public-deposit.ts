/**
 * Reserva pública: seña fija (Mercado Pago) para los servicios listados en IDS.
 * Cambiá `PUBLIC_DEPOSIT_ENABLED` a `true` cuando quieras exigir pago en /turnos.
 */
export const PUBLIC_DEPOSIT_ENABLED = false;

const IDS = [
  "corte-cabello",
  "color",
  "hidratacion-capilar",
  "balayage",
  "mechas",
] as const;

const SET = new Set<string>(IDS);

export function treatmentRequiresPublicDeposit(treatmentId: string): boolean {
  if (!PUBLIC_DEPOSIT_ENABLED) return false;
  return SET.has(treatmentId.trim());
}
