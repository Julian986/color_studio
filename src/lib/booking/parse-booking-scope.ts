import type { BookingSlotScope } from "@/lib/booking/compute-bookable-slots";

export function parseBookingSlotScope(raw: string): BookingSlotScope {
  const v = raw.trim().toLowerCase();
  if (v === "panel_nuevo") return "panel_nuevo";
  if (v === "panel") return "panel";
  return "public";
}

export function requiresPanelAuth(scope: BookingSlotScope): boolean {
  return scope === "panel" || scope === "panel_nuevo";
}
