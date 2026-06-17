import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildSalonCalendarItems,
  getAvailableTimesForDate,
} from "@/lib/booking/salon-availability";
import {
  computeBookableSlots,
  computeBookableSlotsForTreatmentIds,
  computePublicTemplateSlots,
  computePublicTemplateSlotsForTreatmentIds,
} from "@/lib/booking/compute-bookable-slots";
import { parseBookingSlotScope, requiresPanelAuth } from "@/lib/booking/parse-booking-scope";
import { getDb } from "@/lib/mongodb";
import { verifyPanelCookie } from "@/lib/panel-turnos-auth";
import { isValidServiceSelection } from "@/lib/treatments/catalog";
import { findSalonTreatmentById } from "@/lib/treatments/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const monthIndex = Number(url.searchParams.get("monthIndex"));
  const treatmentId = url.searchParams.get("treatmentId")?.trim() ?? "";
  const serviceIds = (url.searchParams.get("serviceIds")?.trim() ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const scope = parseBookingSlotScope(url.searchParams.get("scope") ?? "public");

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Anio invalido." }, { status: 400 });
  }
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return NextResponse.json({ error: "Mes invalido (monthIndex 0-11)." }, { status: 400 });
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
  }

  try {
    const now = new Date();
    const keys = buildSalonCalendarItems(year, monthIndex).map((d) => d.value);

    if (scope === "public") {
      const entries = keys.map((dateKey) => {
        const slots =
          serviceIds.length > 0
            ? computePublicTemplateSlotsForTreatmentIds({ dateKey, treatmentIds: serviceIds, now })
            : computePublicTemplateSlots({ dateKey, treatmentId, now });
        return [dateKey, slots.length > 0] as const;
      });
      return NextResponse.json({ availability: Object.fromEntries(entries) });
    }

    const db = await getDb();
    const entries = await Promise.all(
      keys.map(async (dateKey) => {
        if (scope === "panel_nuevo") {
          return [dateKey, true] as const;
        }
        if (scope === "panel") {
          return [dateKey, getAvailableTimesForDate(dateKey).length > 0] as const;
        }
        const slots =
          serviceIds.length > 0
            ? await computeBookableSlotsForTreatmentIds(db, {
                dateKey,
                treatmentIds: serviceIds,
                now,
                scope,
              })
            : await computeBookableSlots(db, {
                dateKey,
                treatmentId,
                now,
                scope,
              });
        return [dateKey, slots.length > 0] as const;
      }),
    );
    return NextResponse.json({ availability: Object.fromEntries(entries) });
  } catch (e) {
    console.error("[api/booking/month-availability]", e);
    return NextResponse.json({ error: "No se pudo calcular la disponibilidad." }, { status: 500 });
  }
}
