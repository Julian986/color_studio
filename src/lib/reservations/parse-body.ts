import {
  isValidServiceSelection,
  normalizeServiceIds,
  TREATMENT_CATEGORIES,
} from "@/lib/treatments/catalog";
import type { CreateReservationInput, TreatmentCategory } from "./types";

function isCategory(v: unknown): v is TreatmentCategory {
  return typeof v === "string" && (TREATMENT_CATEGORIES as readonly string[]).includes(v);
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

export function parseCreateReservationBody(
  body: unknown,
): { ok: true; value: CreateReservationInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Solicitud inválida." };
  }

  const b = body as Record<string, unknown>;

  const treatmentId = String(b.treatmentId ?? "").trim();
  const treatmentName = String(b.treatmentName ?? "").trim();
  const subtitle = String(b.subtitle ?? "").trim();
  const category = b.category;
  const dateKey = String(b.dateKey ?? "").trim();
  const timeLocal = String(b.timeLocal ?? "").trim();
  const displayDate = String(b.displayDate ?? "").trim();
  const customerName = String(b.customerName ?? "").trim();
  const customerPhone = String(b.customerPhone ?? "").trim();
  const whatsappOptIn = b.whatsappOptIn === true;
  const serviceIdsRaw = Array.isArray(b.serviceIds)
    ? b.serviceIds
    : typeof b.serviceIds === "string"
      ? b.serviceIds.split(",")
      : [];
  let serviceIds = serviceIdsRaw.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (serviceIds.length === 0 && treatmentId) {
    serviceIds = [treatmentId];
  }

  if (!treatmentId) return { ok: false, message: "Falta el servicio." };
  if (!treatmentName) return { ok: false, message: "Falta el nombre del servicio." };
  if (!isCategory(category)) return { ok: false, message: "Categoría inválida." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return { ok: false, message: "Fecha inválida." };
  if (!/^\d{2}:\d{2}$/.test(timeLocal)) return { ok: false, message: "Horario inválido." };
  if (!displayDate) return { ok: false, message: "Falta la fecha para mostrar." };
  if (customerName.length < 2) return { ok: false, message: "El nombre es demasiado corto." };
  const d = digitsOnly(customerPhone);
  if (d.length < 10 || d.length > 15) return { ok: false, message: "El teléfono no es válido." };
  if (!whatsappOptIn) return { ok: false, message: "Tenés que aceptar recordatorios por WhatsApp." };
  const normalizedIds = normalizeServiceIds(serviceIds);
  if (!isValidServiceSelection(normalizedIds)) {
    return { ok: false, message: "Elegí al menos un servicio para reservar." };
  }

  return {
    ok: true,
    value: {
      treatmentId,
      treatmentName,
      subtitle,
      category,
      dateKey,
      timeLocal,
      displayDate,
      customerName,
      customerPhone,
      whatsappOptIn,
      serviceIds: normalizedIds,
    },
  };
}
