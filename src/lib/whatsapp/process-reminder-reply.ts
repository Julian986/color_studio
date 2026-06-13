import type { Db } from "mongodb";

import { canonicalPhoneDigitsAR, customerPhoneDigitsQueryValues } from "@/lib/customer/phone-canonical-ar";
import {
  cancelReservation,
  confirmAttendanceViaWhatsApp,
  findReservationByHexId,
} from "@/lib/reservations/service";
import type { ReservationDoc } from "@/lib/reservations/types";

import { findReservationIdByOutboundMessageSid, insertWhatsappInboundLog } from "./whatsapp-logs";
import type { WaReminderInboundAction } from "./parse-inbound-action";
import { whatsAppFromToDigits } from "./twilio-phone";

const COLLECTION = "reservations";
const BOOKING_URL =
  (process.env.APP_BASE_URL ?? "https://colorstudiomoscardini.com").replace(/\/$/, "") + "/turnos";

async function findReservationForInboundReply(
  db: Db,
  input: { originalMessageSid?: string | null; fromWhatsApp: string; now: Date },
): Promise<ReservationDoc | null> {
  const originalSid = input.originalMessageSid?.trim();
  if (originalSid) {
    const hex = await findReservationIdByOutboundMessageSid(db, originalSid);
    if (hex) {
      const doc = await findReservationByHexId(db, hex);
      if (doc) return doc;
    }
  }

  const digits = canonicalPhoneDigitsAR(whatsAppFromToDigits(input.fromWhatsApp));
  if (!digits) return null;

  const phoneMatch = customerPhoneDigitsQueryValues(digits);
  return db.collection<ReservationDoc>(COLLECTION).findOne(
    {
      customerPhoneDigits: { $in: phoneMatch },
      reservationStatus: { $in: ["confirmed", "pending_payment"] },
      waReminder24hSentAt: { $ne: null },
      startsAt: { $gte: input.now },
    },
    { sort: { startsAt: 1 } },
  );
}

export type ProcessReminderReplyResult =
  | { ok: true; action: WaReminderInboundAction; reservationId: string; replyText: string }
  | { ok: false; reason: string };

export async function processWaReminderInboundReply(
  db: Db,
  input: {
    action: WaReminderInboundAction;
    fromWhatsApp: string;
    originalMessageSid?: string | null;
    inboundMessageSid?: string | null;
    now?: Date;
  },
): Promise<ProcessReminderReplyResult> {
  const now = input.now ?? new Date();
  const doc = await findReservationForInboundReply(db, {
    originalMessageSid: input.originalMessageSid,
    fromWhatsApp: input.fromWhatsApp,
    now,
  });

  if (!doc) {
    await insertWhatsappInboundLog(db, {
      from: input.fromWhatsApp,
      action: input.action,
      sid: input.inboundMessageSid ?? null,
      error: "reservation_not_found",
    });
    return { ok: false, reason: "reservation_not_found" };
  }

  const reservationId = doc._id.toHexString();
  const display = doc.displayDate || doc.dateKey;
  const time = doc.timeLocal;

  if (input.action === "cancel") {
    const cancelled = await cancelReservation(db, {
      reservationHexId: reservationId,
      now,
      actor: "whatsapp",
      customerCanonicalDigits: doc.customerPhoneDigits ?? canonicalPhoneDigitsAR(doc.customerPhone),
      cancelReason: "Cancelado desde WhatsApp (recordatorio)",
    });
    if (!("ok" in cancelled)) {
      await insertWhatsappInboundLog(db, {
        from: input.fromWhatsApp,
        reservationId,
        action: input.action,
        sid: input.inboundMessageSid ?? null,
        error: cancelled.error,
      });
      return { ok: false, reason: "cancel_failed" };
    }

    await insertWhatsappInboundLog(db, {
      from: input.fromWhatsApp,
      reservationId,
      action: input.action,
      sid: input.inboundMessageSid ?? null,
    });

    return {
      ok: true,
      action: input.action,
      reservationId,
      replyText: `Listo, cancelamos tu turno del ${display} a las ${time}. Para reservar otro día entrá a ${BOOKING_URL}`,
    };
  }

  const confirmed = await confirmAttendanceViaWhatsApp(db, { reservationHexId: reservationId, now });
  if (!("ok" in confirmed)) {
    await insertWhatsappInboundLog(db, {
      from: input.fromWhatsApp,
      reservationId,
      action: input.action,
      sid: input.inboundMessageSid ?? null,
      error: confirmed.error,
    });
    return { ok: false, reason: "confirm_failed" };
  }

  await insertWhatsappInboundLog(db, {
    from: input.fromWhatsApp,
    reservationId,
    action: input.action,
    sid: input.inboundMessageSid ?? null,
  });

  const name = doc.customerName?.trim() || "¡Hola!";
  return {
    ok: true,
    action: input.action,
    reservationId,
    replyText: `¡Perfecto, ${name}! Te esperamos el ${display} a las ${time} en Color Studio Moscardini (Calle 67 Nº 3465, Necochea).`,
  };
}
