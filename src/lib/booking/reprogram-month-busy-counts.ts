import type { Db } from "mongodb";

import { agendaBlockAppliesToDateKey } from "@/lib/booking/agenda-blocks-shared";
import { listAgendaBlocksForCalendarMonth } from "@/lib/booking/agenda-blocks";
import { buildPanelMonthGrid } from "@/lib/booking/panel-month-grid";
import { listReservationsForCalendarMonth } from "@/lib/reservations/admin-queries";

/** Turnos + bloqueos de agenda por día (misma lógica que el panel de turnos). */
export async function computeCalendarMonthBusyCountsByDateKey(
  db: Db,
  year: number,
  month: number,
): Promise<Map<string, number>> {
  const [list, blocks] = await Promise.all([
    listReservationsForCalendarMonth(db, year, month),
    listAgendaBlocksForCalendarMonth(db, year, month),
  ]);
  const grid = buildPanelMonthGrid(year, month);
  const m = new Map<string, number>();
  for (const r of list) {
    m.set(r.dateKey, (m.get(r.dateKey) ?? 0) + 1);
  }
  for (const cell of grid) {
    const key = cell.dateKey;
    for (const b of blocks) {
      if (agendaBlockAppliesToDateKey(b, key)) {
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    }
  }
  return m;
}
