import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { computeBookableSlots, computeBookableSlotsForTreatmentIds } from "@/lib/booking/compute-bookable-slots";
import { parseBookingSlotScope, requiresPanelAuth } from "@/lib/booking/parse-booking-scope";
import { buildPanelSlotOverlapMap } from "@/lib/booking/slot-overlap";
import { getDb } from "@/lib/mongodb";
import { verifyPanelCookie } from "@/lib/panel-turnos-auth";
import { findSalonTreatmentById, isValidServiceSelection } from "@/lib/treatments/catalog";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey")?.trim() ?? "";
  const treatmentId = url.searchParams.get("treatmentId")?.trim() ?? "";
  const serviceIds = (url.searchParams.get("serviceIds")?.trim() ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const scope = parseBookingSlotScope(url.searchParams.get("scope") ?? "public");
  const excludeReservationHexId =
    url.searchParams.get("excludeReservationHexId")?.trim() ??
    url.searchParams.get("excludeReservationId")?.trim() ??
    "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Fecha invalida." }, { status: 400 });
  }
  if (!treatmentId && serviceIds.length === 0) {
    return NextResponse.json({ error: "Falta el tratamiento." }, { status: 400 });
  }
  if (serviceIds.length > 0) {
    if (!isValidServiceSelection(serviceIds)) {
      return NextResponse.json(
        { error: "Elegí un servicio válido." },
        { status: 400 },
      );
    }
    if (serviceIds.some((id) => !findSalonTreatmentById(id))) {
      return NextResponse.json({ error: "Hay servicios invalidos." }, { status: 400 });
    }
  } else if (!findSalonTreatmentById(treatmentId)) {
    return NextResponse.json({ error: "Tratamiento invalido." }, { status: 400 });
  }

  if (requiresPanelAuth(scope)) {
    const cookieStore = await cookies();
    if (!verifyPanelCookie(cookieStore.get("panel_turnos_auth")?.value)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
  } else if (excludeReservationHexId) {
    return NextResponse.json({ error: "Parametro no permitido." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const excludeHex = requiresPanelAuth(scope) ? excludeReservationHexId || undefined : undefined;
    const slots =
      serviceIds.length > 0
        ? await computeBookableSlotsForTreatmentIds(db, {
            dateKey,
            treatmentIds: serviceIds,
            now: new Date(),
            scope,
            excludeReservationHexId: excludeHex,
          })
        : await computeBookableSlots(db, {
            dateKey,
            treatmentId,
            now: new Date(),
            scope,
            excludeReservationHexId: excludeHex,
          });

    if (!requiresPanelAuth(scope)) {
      return NextResponse.json({ slots });
    }

    const durationMinutes =
      serviceIds.length > 0
        ? serviceIds.reduce((acc, id) => acc + (findSalonTreatmentById(id)?.durationMinutes ?? 0), 0)
        : (findSalonTreatmentById(treatmentId)?.durationMinutes ?? 60);

    let excludeOid: ObjectId | undefined;
    if (excludeHex && /^[a-f0-9]{24}$/i.test(excludeHex)) {
      try {
        excludeOid = new ObjectId(excludeHex);
      } catch {
        excludeOid = undefined;
      }
    }

    const overlaps = await buildPanelSlotOverlapMap(db, {
      dateKey,
      durationMinutes,
      slots,
      excludeReservationId: excludeOid,
    });

    return NextResponse.json({ slots, overlaps });
  } catch (e) {
    console.error("[api/booking/slots]", e);
    return NextResponse.json({ error: "No se pudieron cargar los horarios." }, { status: 500 });
  }
}
