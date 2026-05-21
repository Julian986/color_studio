import { formatInTimeZone } from "date-fns-tz";

import {
  filterSlotsServiceEndsOnOrBeforeClose,
  getAvailableTimesForDate,
  getLastServiceEndMinutesForDate,
} from "@/lib/booking/salon-availability";
import { filterPublicSlotsByTreatmentRules } from "@/lib/booking/treatment-slot-rules";
import { findSalonTreatmentById } from "@/lib/treatments/catalog";

/** Agenda y “hoy” para reglas de reserva pública (Rosario = mismo offset que CABA). */
export const RESERVATION_TZ = "America/Argentina/Buenos_Aires";

/** Suma un día al calendario (yyyy-MM-dd) sin mezclar husos horarios. */
function addOneCalendarDayFromKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((v) => parseInt(v, 10));
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function argentinaTodayDateKey(now = new Date()): string {
  return formatInTimeZone(now, RESERVATION_TZ, "yyyy-MM-dd");
}

/** Primer día reservable en la web: mañana respecto al “hoy” en Argentina (no se reserva el mismo día). */
export function minPublicBookableDateKey(now = new Date()): string {
  return addOneCalendarDayFromKey(argentinaTodayDateKey(now));
}

/** Horarios visibles para usuarios web: solo desde mañana en adelante. */
export function getPublicBookableTimeSlots(dateKey: string, now = new Date()): string[] {
  if (dateKey < minPublicBookableDateKey(now)) return [];
  const raw = getAvailableTimesForDate(dateKey);
  return raw;
}

/**
 * Reserva pública (sin DB): no el mismo día (desde mañana), cierre vs duración del servicio,
 * reflejos/balayage / keratina.
 * Para solapes entre clientes usá `computeBookableSlots` + `/api/booking/slots`.
 */
export function getPublicBookableTimeSlotsForTreatment(
  treatmentId: string | undefined,
  dateKey: string,
  now = new Date(),
): string[] {
  let slots = getPublicBookableTimeSlots(dateKey, now);
  if (treatmentId) {
    const t = findSalonTreatmentById(treatmentId);
    if (t) {
      slots = filterSlotsServiceEndsOnOrBeforeClose(
        slots,
        t.durationMinutes,
        getLastServiceEndMinutesForDate(dateKey),
      );
    }
  }
  return filterPublicSlotsByTreatmentRules(treatmentId, slots, dateKey);
}

/** Validación servidor para reserva pública (misma regla que UI). */
export function isPublicLeadTimeViolated(dateKey: string, startsAt: Date, now = new Date()): boolean {
  void startsAt;
  return dateKey < minPublicBookableDateKey(now);
}
