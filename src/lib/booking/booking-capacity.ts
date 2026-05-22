import type { BookingSlotScope } from "@/lib/booking/compute-bookable-slots";

/** Web: una clienta por franja (sin solapes). Panel: Yanina puede cargar turnos encimados. */
export function enforceSalonCapacityForScope(scope: BookingSlotScope): boolean {
  return scope === "public";
}
