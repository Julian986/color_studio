import {
  SALON_TREATMENTS,
  TREATMENT_CATEGORIES,
  type TreatmentCategory,
} from "@/lib/treatments/catalog";
import { isArgentinaPublicHoliday } from "@/lib/booking/argentina-holidays";

export type SalonTreatmentOption = {
  id: string;
  name: string;
  subtitle: string;
  category: TreatmentCategory;
};

export const SALON_TREATMENT_CATEGORIES: TreatmentCategory[] = [...TREATMENT_CATEGORIES];

export const SALON_TREATMENT_OPTIONS: SalonTreatmentOption[] = SALON_TREATMENTS.map((t) => ({
  id: t.id,
  name: t.name,
  subtitle: t.subtitle,
  category: t.category,
}));

const SLOT_STEP_MINUTES = 30;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToHhmm(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Inicios cada 30 min: `open` inclusive, `close` exclusive. */
function buildStepSlots(openH: number, openM: number, closeH: number, closeM: number): string[] {
  let t = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  const out: string[] = [];
  while (t < end) {
    out.push(minutesToHhmm(t));
    t += SLOT_STEP_MINUTES;
  }
  return out;
}

/** Hora de cierre del día (el servicio debe terminar a esta hora o antes). */
function lastServiceEndMinutesForWeekday(weekday: number): number {
  switch (weekday) {
    case 2: // Mar
    case 4: // Jue
      return 16 * 60;
    case 3: // Mié
    case 5: // Vie
      return 14 * 60 + 30;
    case 6: // Sáb
      return 13 * 60;
    default:
      return 0;
  }
}

/**
 * Agenda Yanina (ART), provisional:
 * - Mar y jue: 10:00–16:00 (último inicio según duración del servicio)
 * - Mié y vie: 9:30–14:30
 * - Sáb: 9:30–13:00
 * - Lun y dom: cerrado
 */
const availableTimesByWeekday: Record<number, string[]> = {
  0: [],
  1: [],
  2: buildStepSlots(10, 0, 16, 0),
  3: buildStepSlots(9, 30, 14, 30),
  4: buildStepSlots(10, 0, 16, 0),
  5: buildStepSlots(9, 30, 14, 30),
  6: buildStepSlots(9, 30, 13, 0),
};

const availableTimesByDateOverride: Record<string, string[]> = {};

/**
 * Alta manual en panel (/panel-turnos/nuevo): cualquier día, horarios en este rango.
 * Último inicio posible: 19:30 (cierre exclusivo a las 20:00).
 */
const PANEL_NUEVO_OPEN_H = 8;
const PANEL_NUEVO_OPEN_M = 0;
const PANEL_NUEVO_CLOSE_H = 20;
const PANEL_NUEVO_CLOSE_M = 0;

export const PANEL_NUEVO_TIME_RANGE_LABEL = `${pad2(PANEL_NUEVO_OPEN_H)}:${pad2(PANEL_NUEVO_OPEN_M)} a ${pad2(PANEL_NUEVO_CLOSE_H)}:${pad2(PANEL_NUEVO_CLOSE_M)}`;

const PANEL_NUEVO_TIME_SLOTS = buildStepSlots(
  PANEL_NUEVO_OPEN_H,
  PANEL_NUEVO_OPEN_M,
  PANEL_NUEVO_CLOSE_H,
  PANEL_NUEVO_CLOSE_M,
);

/** Temporal: activar con `NEXT_PUBLIC_SALON_CALENDAR_TEST_MODE=true` (cliente + servidor). */
function isSalonCalendarTestMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_SALON_CALENDAR_TEST_MODE === "true" ||
    process.env.SALON_CALENDAR_TEST_MODE === "true"
  );
}

/** Horario de prueba para dom/lun (mismo que sábado web). */
const TEST_WEB_SLOTS_SUN_MON = buildStepSlots(9, 30, 13, 0);

function slotsForWeekday(weekday: number): string[] {
  const normal = availableTimesByWeekday[weekday] ?? [];
  if (normal.length > 0) return normal;
  if (isSalonCalendarTestMode() && (weekday === 0 || weekday === 1)) {
    return TEST_WEB_SLOTS_SUN_MON;
  }
  return [];
}

/** Horarios del picker en alta manual (/panel-turnos/nuevo): cualquier día, rango fijo. */
export function getPanelNuevoPickerTimeSlots(value: string): string[] {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return [];
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) return [];
  return PANEL_NUEVO_TIME_SLOTS;
}

export function getLastServiceEndMinutesForDate(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const weekday = new Date(y, m - 1, d).getDay();
  if (isSalonCalendarTestMode() && (weekday === 0 || weekday === 1)) {
    return 13 * 60;
  }
  return lastServiceEndMinutesForWeekday(weekday);
}

/** @deprecated Usar `getLastServiceEndMinutesForDate` por día. */
export const SALON_LAST_SERVICE_END_MINUTES = 16 * 60;

export function filterSlotsServiceEndsOnOrBeforeClose(
  slots: string[],
  durationMinutes: number,
  lastServiceEndMinutes: number,
): string[] {
  return slots.filter((t) => hhmmToMinutes(t) + durationMinutes <= lastServiceEndMinutes);
}

export const salonWeekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const salonMonthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function formatSalonDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getAvailableTimesForDate(value: string) {
  const date = parseDateKey(value);
  const today = startOfDay(new Date());

  if (startOfDay(date) < today) {
    return [];
  }
  if (isArgentinaPublicHoliday(value)) {
    return [];
  }

  const override = availableTimesByDateOverride[value];
  if (override) {
    return override;
  }

  return slotsForWeekday(date.getDay());
}

export type SalonCalendarItem = {
  value: string;
  dayNumber: number;
  weekday: string;
  isCurrentMonth: boolean;
  isAvailable: boolean;
};

export function buildSalonCalendarItems(year: number, monthIndex: number): SalonCalendarItem[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const gridStartDate = new Date(year, monthIndex, 1 - startWeekday);

  return Array.from({ length: 35 }, (_, index) => {
    const currentDate = new Date(gridStartDate);
    currentDate.setDate(gridStartDate.getDate() + index);

    const value = formatSalonDateKey(currentDate);

    return {
      value,
      dayNumber: currentDate.getDate(),
      weekday: salonWeekdayLabels[currentDate.getDay()],
      isCurrentMonth: currentDate.getMonth() === monthIndex,
      isAvailable: getAvailableTimesForDate(value).length > 0,
    };
  });
}

export function formatSalonDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Elegí día";

  const date = new Date(year, month - 1, day);
  return `${salonWeekdayLabels[date.getDay()]}, ${day} ${salonMonthNames[month - 1].slice(0, 3).toLowerCase()}`;
}

export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isLikelyWhatsappNumber(raw: string): boolean {
  const digits = normalizePhoneDigits(raw);
  return digits.length >= 10 && digits.length <= 15;
}
