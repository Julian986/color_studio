import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { BookingSlotScope } from "@/lib/booking/compute-bookable-slots";
import { computeReprogramDayRows } from "@/lib/booking/panel-reprogram-day-rows";
import { canonicalPhoneDigitsAR, customerPhoneDigitsQueryValues } from "@/lib/customer/phone-canonical-ar";
import { CUSTOMER_PROFILE_COOKIE, readCustomerProfilePhoneDigits } from "@/lib/customer/customer-session";
import { getDb } from "@/lib/mongodb";
import { findReservationByHexId, ensureReservationIndexes } from "@/lib/reservations/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const hex = id.trim();

  const url = new URL(request.url);
  const dateKey = url.searchParams.get("dateKey")?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(CUSTOMER_PROFILE_COOKIE)?.value;
  const fromCookie = readCustomerProfilePhoneDigits(raw);
  if (!fromCookie) {
    return NextResponse.json({ error: "No iniciaste sesión." }, { status: 401 });
  }
  const digits = canonicalPhoneDigitsAR(fromCookie);
  if (!digits) {
    return NextResponse.json({ error: "No iniciaste sesión." }, { status: 401 });
  }

  try {
    const db = await getDb();
    await ensureReservationIndexes(db);
    const doc = await findReservationByHexId(db, hex);
    if (!doc) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    const docDigits = doc.customerPhoneDigits ?? canonicalPhoneDigitsAR(doc.customerPhone);
    if (!customerPhoneDigitsQueryValues(digits).includes(docDigits)) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }

    const slotScope: BookingSlotScope = doc.source === "panel" ? "panel" : "public";
    const rows = await computeReprogramDayRows(db, {
      dateKey,
      treatmentId: String(doc.treatmentId ?? "").trim(),
      now: new Date(),
      scope: slotScope,
      excludeReservationHexId: hex,
    });
    return NextResponse.json({ rows });
  } catch (e) {
    console.error("[api/me/reservations/[id]/day-slots]", e);
    return NextResponse.json({ error: "No se pudo cargar la agenda del día." }, { status: 500 });
  }
}
