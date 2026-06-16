import type { BookingSlotScope } from "@/lib/booking/compute-bookable-slots";

/** Brecha entre turnos en reservas web (limpieza / transición). */
export const SALON_TURNO_GAP_MINUTES = 15;

/** Web: una clienta por franja (sin solapes). Panel: Yanina puede cargar turnos encimados. */
export function enforceSalonCapacityForScope(scope: BookingSlotScope): boolean {
  return scope === "public";
}
