import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { verifyPanelCookie } from "@/lib/panel-turnos-auth";
import {
  listRecentCustomersForPanel,
  searchCustomersForPanel,
} from "@/lib/reservations/panel-customer-directory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!verifyPanelCookie(cookieStore.get("panel_turnos_auth")?.value)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  try {
    const db = await getDb();
    const customers =
      q.length >= 2
        ? await searchCustomersForPanel(db, q, 8)
        : await listRecentCustomersForPanel(db, 10);

    return NextResponse.json({ customers });
  } catch (e) {
    console.error("[api/panel-turnos/customers GET]", e);
    return NextResponse.json({ error: "No se pudieron cargar las clientas." }, { status: 500 });
  }
}
