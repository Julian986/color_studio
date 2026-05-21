import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { computeCalendarMonthBusyCountsByDateKey } from "@/lib/booking/reprogram-month-busy-counts";
import { canonicalPhoneDigitsAR } from "@/lib/customer/phone-canonical-ar";
import { CUSTOMER_PROFILE_COOKIE, readCustomerProfilePhoneDigits } from "@/lib/customer/customer-session";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CUSTOMER_PROFILE_COOKIE)?.value;
  const fromCookie = readCustomerProfilePhoneDigits(raw);
  if (!fromCookie) {
    return NextResponse.json({ error: "No iniciaste sesión." }, { status: 401 });
  }
  if (!canonicalPhoneDigitsAR(fromCookie)) {
    return NextResponse.json({ error: "No iniciaste sesión." }, { status: 401 });
  }

  const url = new URL(request.url);
  const y = Number(url.searchParams.get("year"));
  const m = Number(url.searchParams.get("month"));
  if (!Number.isFinite(y) || y < 2000 || y > 2100 || !Number.isFinite(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "Año o mes inválido." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const map = await computeCalendarMonthBusyCountsByDateKey(db, y, m);
    return NextResponse.json({ counts: Object.fromEntries(map) });
  } catch (e) {
    console.error("[api/me/reservations/month-counts]", e);
    return NextResponse.json({ error: "No se pudo cargar el calendario." }, { status: 500 });
  }
}
