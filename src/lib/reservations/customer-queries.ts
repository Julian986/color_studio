import type { Db } from "mongodb";

import { canonicalPhoneDigitsAR, customerPhoneDigitsQueryValues } from "@/lib/customer/phone-canonical-ar";

import type { ReservationDoc } from "./types";

const COLLECTION = "reservations";

/** Reservas del cliente (mismo WhatsApp, formato AR unificado + variantes guardadas). */
export async function listReservationsByCustomerPhoneDigits(
  db: Db,
  phoneDigitsCanonical: string,
): Promise<ReservationDoc[]> {
  const keys = customerPhoneDigitsQueryValues(phoneDigitsCanonical);
  return db
    .collection<ReservationDoc>(COLLECTION)
    .find({ customerPhoneDigits: { $in: keys } })
    .sort({ startsAt: -1 })
    .limit(200)
    .toArray();
}

/** Rellena `customerPhoneDigits` en documentos sin el campo (tandas acotadas). */
export async function backfillCustomerPhoneDigitsBatch(db: Db, batchSize = 250): Promise<number> {
  const col = db.collection<ReservationDoc>(COLLECTION);
  const rows = await col
    .find({ customerPhoneDigits: { $exists: false } }, { projection: { _id: 1, customerPhone: 1 } })
    .limit(batchSize)
    .toArray();
  if (rows.length === 0) return 0;
  await Promise.all(
    rows.map((r) =>
      col.updateOne(
        { _id: r._id },
        { $set: { customerPhoneDigits: canonicalPhoneDigitsAR(String(r.customerPhone ?? "")) } },
      ),
    ),
  );
  return rows.length;
}

/**
 * Re-normaliza `customerPhoneDigits` en todos los documentos cuya forma guardada
 * no coincide con la normalización corregida (variantes "0…" o "9…" mal canonicalizadas).
 * Se ejecuta una sola vez al subir la versión de índices.
 */
export async function renormalizeCustomerPhoneDigitsBatch(db: Db, batchSize = 250): Promise<number> {
  const col = db.collection<ReservationDoc>(COLLECTION);
  // Busca documentos con la forma canónica antigua incorrecta:
  // "5490XXXXXXXXXX" (de "011...") o "5499XXXXXXXXXX" (de "9 11...")
  const rows = await col
    .find(
      {
        customerPhoneDigits: {
          $regex: "^(5490|5499)",
        },
      },
      { projection: { _id: 1, customerPhone: 1 } },
    )
    .limit(batchSize)
    .toArray();
  if (rows.length === 0) return 0;
  await Promise.all(
    rows.map((r) =>
      col.updateOne(
        { _id: r._id },
        { $set: { customerPhoneDigits: canonicalPhoneDigitsAR(String(r.customerPhone ?? "")) } },
      ),
    ),
  );
  return rows.length;
}
