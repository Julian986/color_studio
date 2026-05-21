function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function moveToObservedMonday(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  const weekday = date.getDay(); // 0 dom .. 6 sab
  if (weekday === 2 || weekday === 3) {
    date.setDate(date.getDate() - (weekday - 1)); // martes/miercoles -> lunes previo
  } else if (weekday === 4 || weekday === 5) {
    date.setDate(date.getDate() + (8 - weekday)); // jueves/viernes -> lunes siguiente
  }
  return toDateKey(date);
}

function computeEasterSunday(year: number): Date {
  // Algoritmo gregoriano (Meeus/Jones/Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function buildArgentinaHolidaySet(year: number): Set<string> {
  const out = new Set<string>();

  // Feriados inamovibles nacionales.
  out.add(`${year}-01-01`);
  out.add(`${year}-03-24`);
  out.add(`${year}-04-02`);
  out.add(`${year}-05-01`);
  out.add(`${year}-05-25`);
  out.add(`${year}-06-20`);
  out.add(`${year}-07-09`);
  out.add(`${year}-12-08`);
  out.add(`${year}-12-25`);

  // Feriados trasladables.
  out.add(moveToObservedMonday(year, 5, 17)); // 17/06
  out.add(moveToObservedMonday(year, 7, 17)); // 17/08
  out.add(moveToObservedMonday(year, 9, 12)); // 12/10
  out.add(moveToObservedMonday(year, 10, 20)); // 20/11

  // Carnaval (lunes y martes) y Viernes Santo.
  const easter = computeEasterSunday(year);
  const carnivalMonday = new Date(easter);
  carnivalMonday.setDate(easter.getDate() - 48);
  const carnivalTuesday = new Date(easter);
  carnivalTuesday.setDate(easter.getDate() - 47);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  out.add(toDateKey(carnivalMonday));
  out.add(toDateKey(carnivalTuesday));
  out.add(toDateKey(goodFriday));

  return out;
}

const byYear = new Map<number, Set<string>>();

export function isArgentinaPublicHoliday(dateKey: string): boolean {
  const [ys] = dateKey.split("-");
  const year = Number(ys);
  if (!Number.isInteger(year)) return false;
  if (!byYear.has(year)) {
    byYear.set(year, buildArgentinaHolidaySet(year));
  }
  return byYear.get(year)!.has(dateKey);
}

