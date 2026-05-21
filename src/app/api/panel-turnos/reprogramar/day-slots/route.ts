import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { computePanelReprogramDayRows } from "@/lib/booking/panel-reprogram-day-rows";
import { getDb } from "@/lib/mongodb";
import { verifyPanelCookie } from "@/lib/panel-turnos-auth";
import { ensureReservationIndexes } from "@/lib/reservations/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!verifyPanelCookie(cookieStore.get("panel_turnos_auth")?.value)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey")?.trim() ?? "";
  const treatmentId = url.searchParams.get("treatmentId")?.trim() ?? "";
  const excludeReservationHexId = url.searchParams.get("excludeReservationHexId")?.trim() ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!treatmentId) {
    return NextResponse.json({ error: "Falta el tratamiento." }, { status: 400 });
  }

  try {
    const db = await getDb();
    await ensureReservationIndexes(db);
    const rows = await computePanelReprogramDayRows(db, {
      dateKey,
      treatmentId,
      excludeReservationHexId: excludeReservationHexId || null,
      now: new Date(),
    });
    return NextResponse.json({ rows });
  } catch (e) {
    console.error("[api/panel-turnos/reprogramar/day-slots]", e);
    return NextResponse.json({ error: "No se pudo cargar la agenda del día." }, { status: 500 });
  }
}
