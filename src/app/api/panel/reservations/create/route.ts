import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { verifyPanelCookie } from "@/lib/panel-turnos-auth";
import { insertPanelReservation } from "@/lib/reservations/service";
import { isLikelyWhatsappNumber } from "@/lib/booking/salon-availability";
import { isValidServiceSelection, normalizeServiceIds } from "@/lib/treatments/catalog";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!verifyPanelCookie(cookieStore.get("panel_turnos_auth")?.value)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const treatmentId = typeof b.treatmentId === "string" ? b.treatmentId.trim() : "";
  const serviceIdsRaw = Array.isArray(b.serviceIds)
    ? b.serviceIds
    : typeof b.serviceIds === "string"
      ? b.serviceIds.split(",")
      : [];
  const serviceIds = normalizeServiceIds(
    serviceIdsRaw.map((v) => String(v ?? "").trim()).filter(Boolean).length > 0
      ? serviceIdsRaw.map((v) => String(v ?? "").trim())
      : treatmentId
        ? [treatmentId]
        : [],
  );
  const dateKey = typeof b.dateKey === "string" ? b.dateKey : "";
  const timeLocal = typeof b.timeLocal === "string" ? b.timeLocal : "";
  const customerName = typeof b.customerName === "string" ? b.customerName : "";
  const customerPhone = typeof b.customerPhone === "string" ? b.customerPhone : "";
  const whatsappOptIn = b.whatsappOptIn === true;
  const panelNotes = b.panelNotes == null ? null : typeof b.panelNotes === "string" ? b.panelNotes : undefined;

  if (!isValidServiceSelection(serviceIds)) {
    return NextResponse.json({ error: "Falta el tratamiento." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey.trim())) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(timeLocal.trim())) {
    return NextResponse.json({ error: "Horario inválido." }, { status: 400 });
  }
  if (customerName.trim().length < 2) {
    return NextResponse.json({ error: "Nombre demasiado corto." }, { status: 400 });
  }
  if (!isLikelyWhatsappNumber(customerPhone)) {
    return NextResponse.json({ error: "Teléfono de WhatsApp inválido." }, { status: 400 });
  }
  if (!whatsappOptIn) {
    return NextResponse.json({ error: "Tenés que aceptar recordatorios por WhatsApp." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await insertPanelReservation(db, {
      treatmentId: serviceIds[0],
      serviceIds,
      dateKey,
      timeLocal,
      customerName,
      customerPhone,
      whatsappOptIn,
      panelNotes,
    });

    if ("error" in result) {
      const status = result.code === "SLOT_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("[panel reservations create]", e);
    return NextResponse.json({ error: "No se pudo crear la reserva." }, { status: 500 });
  }
}
