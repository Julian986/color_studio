import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { canonicalPhoneDigitsAR, customerPhoneDigitsQueryValues } from "@/lib/customer/phone-canonical-ar";
import { CUSTOMER_PROFILE_COOKIE, readCustomerProfilePhoneDigits } from "@/lib/customer/customer-session";
import { getDb } from "@/lib/mongodb";
import { serializeReservationForCustomer } from "@/lib/reservations/customer-public-serialize";
import { cancelReservation, ensureReservationIndexes, findReservationByHexId, rescheduleReservation } from "@/lib/reservations/service";

export const dynamic = "force-dynamic";

function statusFromRescheduleCode(code: string | undefined): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_MOVABLE":
    case "SLOT_UNAVAILABLE":
    case "SLOT_OVERLAP":
    case "CONFLICT":
      return 409;
    default:
      return 400;
  }
}

function statusFromCancelCode(code: string | undefined): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_CANCELLABLE":
    case "CONFLICT":
      return 409;
    default:
      return 400;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const hex = id.trim();

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
    return NextResponse.json(serializeReservationForCustomer(doc));
  } catch (e) {
    console.error("[api/me/reservations/[id] GET]", e);
    return NextResponse.json({ error: "No se pudo cargar el turno." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const hex = id.trim();

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const dateKey = typeof body === "object" && body && "dateKey" in body ? String((body as { dateKey: unknown }).dateKey ?? "").trim() : "";
  const timeLocal =
    typeof body === "object" && body && "timeLocal" in body ? String((body as { timeLocal: unknown }).timeLocal ?? "").trim() : "";

  try {
    const db = await getDb();
    await ensureReservationIndexes(db);
    const result = await rescheduleReservation(db, {
      reservationHexId: hex,
      newDateKey: dateKey,
      newTimeLocal: timeLocal,
      now: new Date(),
      actor: "customer",
      customerCanonicalDigits: digits,
    });
    if ("error" in result) {
      const status = statusFromRescheduleCode(result.code);
      if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 404 });
      }
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/me/reservations/[id] PATCH]", e);
    return NextResponse.json({ error: "No se pudo actualizar el turno." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const hex = id.trim();

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

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const cancelReason =
    typeof body === "object" && body && "cancelReason" in body
      ? String((body as { cancelReason: unknown }).cancelReason ?? "").trim()
      : "";

  try {
    const db = await getDb();
    await ensureReservationIndexes(db);
    const result = await cancelReservation(db, {
      reservationHexId: hex,
      now: new Date(),
      actor: "customer",
      customerCanonicalDigits: digits,
      cancelReason: cancelReason || undefined,
    });
    if ("error" in result) {
      const status = statusFromCancelCode(result.code);
      if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 404 });
      }
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/me/reservations/[id] DELETE]", e);
    return NextResponse.json({ error: "No se pudo cancelar el turno." }, { status: 500 });
  }
}
