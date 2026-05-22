import type { Db, ObjectId } from "mongodb";
import { ObjectId as ObjectIdCtor } from "mongodb";

import { buildCapGetterForDate } from "@/lib/booking/agenda-blocks";
import {
  filterSlotsServiceEndsOnOrBeforeClose,
  getAvailableTimesForDate,
  getLastServiceEndMinutesForDate,
} from "@/lib/booking/salon-availability";
import { getPublicBookableTimeSlots } from "@/lib/booking/public-slot-lead";
import { filterPublicSlotsByTreatmentRules } from "@/lib/booking/treatment-slot-rules";
import { enforceSalonCapacityForScope } from "@/lib/booking/booking-capacity";
import { filterSlotsBySalonCapacity, loadBusyIntervalsMs } from "@/lib/booking/slot-overlap";
import { findSalonTreatmentById } from "@/lib/treatments/catalog";

export type BookingSlotScope = "public" | "panel";

/**
 * Horarios elegibles para un día y tratamiento (plantilla + reglas de servicio + solapes con DB).
 */
export async function computeBookableSlots(
  db: Db,
  params: {
    dateKey: string;
    treatmentId: string;
    now: Date;
    scope: BookingSlotScope;
    /** Al reprogramar, excluir esta reserva del cómputo de ocupación. */
    excludeReservationHexId?: string | null;
  },
): Promise<string[]> {
  const treatment = findSalonTreatmentById(params.treatmentId.trim());
  if (!treatment) return [];

  let excludeId: ObjectId | undefined;
  const ex = params.excludeReservationHexId?.trim();
  if (ex && /^[a-f0-9]{24}$/i.test(ex)) {
    try {
      excludeId = new ObjectIdCtor(ex);
    } catch {
      excludeId = undefined;
    }
  }

  let slots =
    params.scope === "public"
      ? getPublicBookableTimeSlots(params.dateKey, params.now)
      : getAvailableTimesForDate(params.dateKey);

  slots = filterSlotsServiceEndsOnOrBeforeClose(
    slots,
    treatment.durationMinutes,
    getLastServiceEndMinutesForDate(params.dateKey),
  );
  slots = filterPublicSlotsByTreatmentRules(treatment.id, slots, params.dateKey);
  const capGetter = await buildCapGetterForDate(db, params.dateKey);
  const busy = enforceSalonCapacityForScope(params.scope)
    ? await loadBusyIntervalsMs(db, params.dateKey, excludeId)
    : [];
  return filterSlotsBySalonCapacity(slots, params.dateKey, treatment.durationMinutes, busy, capGetter);
}

/**
 * Horarios elegibles para combo de servicios (duración total y reglas por servicio).
 */
export async function computeBookableSlotsForTreatmentIds(
  db: Db,
  params: {
    dateKey: string;
    treatmentIds: string[];
    now: Date;
    scope: BookingSlotScope;
    excludeReservationHexId?: string | null;
  },
): Promise<string[]> {
  const ids = params.treatmentIds.map((v) => v.trim()).filter(Boolean);
  if (ids.length === 0) return [];
  const treatments = ids
    .map((id) => findSalonTreatmentById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  if (treatments.length !== ids.length) return [];
  const totalDuration = treatments.reduce((acc, t) => acc + t.durationMinutes, 0);

  let excludeId: ObjectId | undefined;
  const ex = params.excludeReservationHexId?.trim();
  if (ex && /^[a-f0-9]{24}$/i.test(ex)) {
    try {
      excludeId = new ObjectIdCtor(ex);
    } catch {
      excludeId = undefined;
    }
  }

  let slots =
    params.scope === "public"
      ? getPublicBookableTimeSlots(params.dateKey, params.now)
      : getAvailableTimesForDate(params.dateKey);
  slots = filterSlotsServiceEndsOnOrBeforeClose(
    slots,
    totalDuration,
    getLastServiceEndMinutesForDate(params.dateKey),
  );
  for (const t of treatments) {
    slots = filterPublicSlotsByTreatmentRules(t.id, slots, params.dateKey);
  }
  const capGetter = await buildCapGetterForDate(db, params.dateKey);
  const busy = enforceSalonCapacityForScope(params.scope)
    ? await loadBusyIntervalsMs(db, params.dateKey, excludeId)
    : [];
  return filterSlotsBySalonCapacity(slots, params.dateKey, totalDuration, busy, capGetter);
}
