import type { Db } from "mongodb";

export type WhatsappLogDirection = "outbound" | "inbound";

export async function insertWhatsappOutboundLog(
  db: Db,
  doc: {
    reservationId: string;
    to: string;
    sid: string | null;
    status: string;
    template: string | null;
    templateVariables?: Record<string, string>;
  },
): Promise<void> {
  await db.collection("whatsapp_logs").insertOne({
    direction: "outbound" as const,
    reservationId: doc.reservationId,
    to: doc.to,
    sid: doc.sid,
    status: doc.status,
    template: doc.template,
    templateVariables: doc.templateVariables ?? null,
    createdAt: new Date(),
  });
}

export async function insertWhatsappInboundLog(
  db: Db,
  doc: {
    from: string;
    reservationId?: string | null;
    action?: string | null;
    sid?: string | null;
    raw?: Record<string, string>;
    error?: string | null;
  },
): Promise<void> {
  await db.collection("whatsapp_logs").insertOne({
    direction: "inbound" as const,
    from: doc.from,
    reservationId: doc.reservationId ?? null,
    action: doc.action ?? null,
    sid: doc.sid ?? null,
    raw: doc.raw ?? null,
    error: doc.error ?? null,
    createdAt: new Date(),
  });
}

export async function findReservationIdByOutboundMessageSid(
  db: Db,
  messageSid: string,
): Promise<string | null> {
  const log = await db.collection("whatsapp_logs").findOne(
    {
      direction: "outbound",
      sid: messageSid,
      reservationId: { $type: "string" },
    },
    { projection: { reservationId: 1 } },
  );
  const id = log?.reservationId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
