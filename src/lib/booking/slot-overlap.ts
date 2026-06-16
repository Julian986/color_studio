import type { Db, ObjectId } from "mongodb";
import { formatInTimeZone } from "date-fns-tz";

import { RESERVATION_TZ } from "@/lib/booking/public-slot-lead";
import { SALON_TURNO_GAP_MINUTES } from "@/lib/booking/booking-capacity";
import { findSalonTreatmentById } from "@/lib/treatments/catalog";

const COLLECTION = "reservations";
const ACTIVE_STATUSES = ["confirmed"] as const;

export type IntervalMs = { startMs: number; endMs: number };

/** Extiende el intervalo con la brecha posterior entre turnos (reserva web). */
export function intervalWithTurnGap(interval: IntervalMs): IntervalMs {
  if (SALON_TURNO_GAP_MINUTES <= 0) return interval;
  return { startMs: interval.startMs, endMs: interval.endMs + SALON_TURNO_GAP_MINUTES * 60_000 };
}

export function intervalsOverlap(a: IntervalMs, b: IntervalMs): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

/** Inicio/fin del turno en epoch ms (misma convención que `computeStartsAtUtc`, ART -03:00). */
export function slotIntervalMs(
  dateKey: string,
  timeLocal: string,
  durationMinutes: number,
): IntervalMs | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(timeLocal)) {
    return null;
  }
  const d = new Date(`${dateKey}T${timeLocal}:00-03:00`);
  if (Number.isNaN(d.getTime())) return null;
  const startMs = d.getTime();
  const endMs = startMs + durationMinutes * 60_000;
  return { startMs, endMs };
}

/** Color Studio: una clienta a la vez (Yanina atiende sola). */
export function salonConcurrentCapAtInstant(_dateKey: string, _instantMs: number): number {
  return 1;
}

export function reservationDurationMinutesFromDoc(r: {
  durationMinutes?: unknown;
  treatmentId?: unknown;
}): number {
  if (typeof r.durationMinutes === "number" && Number.isFinite(r.durationMinutes) && r.durationMinutes > 0) {
    return r.durationMinutes;
  }
  const tid = String(r.treatmentId ?? "").trim();
  return findSalonTreatmentById(tid)?.durationMinutes ?? 60;
}

function durationForReservationRow(r: {
  durationMinutes?: unknown;
  treatmentId?: unknown;
  startsAt?: unknown;
}): number {
  return reservationDurationMinutesFromDoc(r);
}

export async function loadBusyIntervalsMs(
  db: Db,
  dateKey: string,
  excludeReservationId?: ObjectId,
): Promise<IntervalMs[]> {
  const filter: Record<string, unknown> = {
    dateKey,
    reservationStatus: { $in: [...ACTIVE_STATUSES] },
  };
  if (excludeReservationId) {
    filter._id = { $ne: excludeReservationId };
  }
  const rows = await db
    .collection(COLLECTION)
    .find(filter, { projection: { startsAt: 1, durationMinutes: 1, treatmentId: 1 } })
    .toArray();

  return rows.map((r) => {
    const startsAt = r.startsAt instanceof Date ? r.startsAt : new Date(String(r.startsAt));
    const startMs = startsAt.getTime();
    const dur = durationForReservationRow(r as { durationMinutes?: unknown; treatmentId?: unknown });
    return intervalWithTurnGap({ startMs, endMs: startMs + dur * 60_000 });
  });
}

function capacityBoundaryInstantsMs(dateKey: string): number[] {
  return [
    new Date(`${dateKey}T09:00:00-03:00`).getTime(),
    new Date(`${dateKey}T11:31:00-03:00`).getTime(),
  ];
}

/**
 * ¿Se puede agregar este intervalo sin superar la capacidad por franja?
 * Una clienta a la vez. `getEffectiveCap` puede reducir cupos por bloqueos de agenda.
 */
export function canPlaceReservationSlot(
  dateKey: string,
  candidate: IntervalMs,
  busy: IntervalMs[],
  getEffectiveCap?: (instantMs: number) => number,
): boolean {
  const relevant = busy.filter((b) => intervalsOverlap(b, candidate));
  const points = new Set<number>([candidate.startMs, candidate.endMs]);
  for (const b of relevant) {
    const s = Math.max(b.startMs, candidate.startMs);
    const e = Math.min(b.endMs, candidate.endMs);
    if (s < e) {
      points.add(s);
      points.add(e);
    }
  }
  for (const bt of capacityBoundaryInstantsMs(dateKey)) {
    if (bt > candidate.startMs && bt < candidate.endMs) {
      points.add(bt);
    }
  }

  const sorted = [...points].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    const t0 = sorted[i];
    const t1 = sorted[i + 1];
    if (t1 <= t0) continue;
    const lo = Math.max(t0, candidate.startMs);
    const hi = Math.min(t1, candidate.endMs);
    if (hi <= lo) continue;
    const mid = (lo + hi) / 2;
    const cap = getEffectiveCap ? getEffectiveCap(mid) : salonConcurrentCapAtInstant(dateKey, mid);
    let depth = 0;
    for (const b of relevant) {
      if (b.startMs < hi && b.endMs > lo) depth++;
    }
    if (depth + 1 > cap) return false;
  }
  return true;
}

export function filterSlotsBySalonCapacity(
  slots: string[],
  dateKey: string,
  durationMinutes: number,
  busy: IntervalMs[],
  getEffectiveCap?: (instantMs: number) => number,
): string[] {
  return slots.filter((timeLocal) => {
    const slot = slotIntervalMs(dateKey, timeLocal, durationMinutes);
    if (!slot) return false;
    return canPlaceReservationSlot(dateKey, intervalWithTurnGap(slot), busy, getEffectiveCap);
  });
}

export async function reservationWouldExceedSalonCapacity(
  db: Db,
  dateKey: string,
  candidate: IntervalMs,
  getEffectiveCap?: (instantMs: number) => number,
  excludeReservationId?: ObjectId,
): Promise<boolean> {
  const busy = await loadBusyIntervalsMs(db, dateKey, excludeReservationId);
  return !canPlaceReservationSlot(dateKey, intervalWithTurnGap(candidate), busy, getEffectiveCap);
}

export type PanelSlotOverlapHit = {
  customerName: string;
  treatmentName: string;
};

/** Turnos confirmados que se superponen con cada inicio (solo panel / aviso visual). */
export async function buildPanelSlotOverlapMap(
  db: Db,
  params: {
    dateKey: string;
    durationMinutes: number;
    slots: string[];
    excludeReservationId?: ObjectId;
  },
): Promise<Record<string, PanelSlotOverlapHit[]>> {
  const resRows = await db
    .collection(COLLECTION)
    .find(
      {
        dateKey: params.dateKey,
        reservationStatus: { $in: [...ACTIVE_STATUSES] },
        ...(params.excludeReservationId ? { _id: { $ne: params.excludeReservationId } } : {}),
      },
      { projection: { timeLocal: 1, durationMinutes: 1, treatmentId: 1, customerName: 1, treatmentName: 1 } },
    )
    .toArray();

  const labeled = resRows
    .map((r) => {
      const timeLocal = String(r.timeLocal ?? "").trim();
      const iv = slotIntervalMs(
        params.dateKey,
        timeLocal,
        reservationDurationMinutesFromDoc(r as { durationMinutes?: unknown; treatmentId?: unknown }),
      );
      if (!iv) return null;
      return {
        interval: iv,
        customerName: String(r.customerName ?? "").trim() || "Cliente",
        treatmentName: String(r.treatmentName ?? "").trim() || "Turno",
      };
    })
    .filter(Boolean) as { interval: IntervalMs; customerName: string; treatmentName: string }[];

  const out: Record<string, PanelSlotOverlapHit[]> = {};
  for (const timeLocal of params.slots) {
    const slot = slotIntervalMs(params.dateKey, timeLocal, params.durationMinutes);
    if (!slot) continue;
    const hits = labeled.filter((r) => intervalsOverlap(slot, r.interval));
    if (hits.length > 0) {
      out[timeLocal] = hits.map((h) => ({
        customerName: h.customerName,
        treatmentName: h.treatmentName,
      }));
    }
  }
  return out;
}
