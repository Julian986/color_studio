import type { Db } from "mongodb";

import { isLikelyWhatsappNumber, normalizePhoneDigits } from "@/lib/booking/salon-availability";
import { canonicalPhoneDigitsAR } from "@/lib/customer/phone-canonical-ar";

import type { ReservationDoc } from "./types";

const COLLECTION = "reservations";

export type PanelCustomerSuggestion = {
  customerName: string;
  customerPhone: string;
  customerPhoneDigits: string;
  phoneDisplay: string;
  lastUsedAt: string | null;
};

export function maskPhoneForPanelDisplay(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  if (digits.length < 4) return raw.trim() || "—";
  return `··· ${digits.slice(-4)}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toSuggestion(row: {
  customerName?: unknown;
  customerPhone?: unknown;
  customerPhoneDigits?: unknown;
  createdAt?: unknown;
}): PanelCustomerSuggestion | null {
  const customerName = String(row.customerName ?? "").trim();
  const customerPhone = String(row.customerPhone ?? "").trim();
  if (customerName.length < 2 || !isLikelyWhatsappNumber(customerPhone)) return null;

  const customerPhoneDigits =
    (typeof row.customerPhoneDigits === "string" && row.customerPhoneDigits.trim()) ||
    canonicalPhoneDigitsAR(customerPhone);
  if (!customerPhoneDigits) return null;

  const lastUsedAt =
    row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : typeof row.createdAt === "string"
        ? row.createdAt
        : null;

  return {
    customerName,
    customerPhone,
    customerPhoneDigits,
    phoneDisplay: maskPhoneForPanelDisplay(customerPhone),
    lastUsedAt,
  };
}

function dedupeSuggestions(rows: ReservationDoc[], limit: number): PanelCustomerSuggestion[] {
  const seen = new Set<string>();
  const out: PanelCustomerSuggestion[] = [];
  for (const row of rows) {
    const item = toSuggestion(row);
    if (!item || seen.has(item.customerPhoneDigits)) continue;
    seen.add(item.customerPhoneDigits);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

const CUSTOMER_PROJECTION = {
  customerName: 1,
  customerPhone: 1,
  customerPhoneDigits: 1,
  createdAt: 1,
} as const;

/** Últimas clientas distintas (por teléfono) usadas en cualquier turno del salón. */
export async function listRecentCustomersForPanel(db: Db, limit = 10): Promise<PanelCustomerSuggestion[]> {
  const rows = await db
    .collection<ReservationDoc>(COLLECTION)
    .find(
      {
        customerPhone: { $exists: true, $type: "string", $ne: "" },
        customerName: { $exists: true, $type: "string", $ne: "" },
      },
      { projection: CUSTOMER_PROJECTION },
    )
    .sort({ createdAt: -1 })
    .limit(Math.max(limit * 12, 80))
    .toArray();

  return dedupeSuggestions(rows, limit);
}

/** Busca por nombre (parcial, sin distinguir mayúsculas). */
export async function searchCustomersForPanel(
  db: Db,
  query: string,
  limit = 8,
): Promise<PanelCustomerSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await db
    .collection<ReservationDoc>(COLLECTION)
    .find(
      {
        customerName: { $regex: escapeRegex(q), $options: "i" },
        customerPhone: { $exists: true, $type: "string", $ne: "" },
      },
      { projection: CUSTOMER_PROJECTION },
    )
    .sort({ createdAt: -1 })
    .limit(Math.max(limit * 10, 60))
    .toArray();

  return dedupeSuggestions(rows, limit);
}
