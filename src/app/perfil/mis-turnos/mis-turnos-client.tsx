"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TrackedLink } from "@/components/analytics/tracked-link";
import { usePerfilSession } from "@/components/perfil/perfil-session-provider";
import { trackEvent } from "@/lib/analytics/track";
import type { CustomerReservationPublic } from "@/lib/reservations/customer-public-serialize";
import { isUpcomingReservation } from "@/lib/reservations/customer-public-serialize";
import { reservationStatusLabel } from "@/lib/reservations/customer-ui-copy";

function formatDayMonthFromKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  return `${m[3]}/${m[2]}`;
}

export function MisTurnosClient() {
  const { me, reservations: ctxReservations, reload: ctxReload } = usePerfilSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<CustomerReservationPublic[] | null>(ctxReservations);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (ctxReservations !== null) setRows(ctxReservations);
  }, [ctxReservations]);

  useEffect(() => {
    if (me === "guest") {
      setError("Iniciá sesión desde Perfil con tu WhatsApp.");
      setRows([]);
    }
  }, [me]);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (searchParams.get("rescheduled") !== "1") return;
    router.replace("/perfil/mis-turnos", { scroll: false });
    void ctxReload().then(() => {
      setSuccessMessage("¡Turno reprogramado con éxito!");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = useMemo(
    () => (rows ?? []).filter((r) => isUpcomingReservation(r)).sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso)),
    [rows],
  );
  const past = useMemo(
    () => (rows ?? []).filter((r) => !isUpcomingReservation(r)).sort((a, b) => b.startsAtIso.localeCompare(a.startsAtIso)),
    [rows],
  );

  const list = tab === "upcoming" ? upcoming : past;

  const handleCancelReservation = useCallback(
    async (reservationId: string) => {
      setCancellingId(reservationId);
      setError(null);
      setSuccessMessage(null);
      try {
        const res = await fetch(`/api/me/reservations/${encodeURIComponent(reservationId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "No se pudo cancelar el turno.");
          return;
        }
        trackEvent("cancel_appointment", { category: "appointments", label: "mis_turnos" });
        await ctxReload();
        setSuccessMessage("Turno cancelado con éxito.");
      } catch {
        setError("Sin conexión.");
      } finally {
        setCancellingId(null);
      }
    },
    [ctxReload],
  );

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-28">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/perfil"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
          aria-label="Volver al perfil"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold leading-tight text-gray-900">Mis turnos</h1>
          <p className="mt-0.5 text-[16px] text-gray-500">Próximos y pasados</p>
        </div>
      </header>

      <div className="mb-5 flex rounded-2xl border border-gray-200 bg-[#F5F5F5] p-1">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`flex-1 cursor-pointer rounded-xl py-3 text-[15px] font-semibold transition ${
            tab === "upcoming" ? "bg-[#B88E2F] text-white shadow-sm" : "text-gray-600 hover:bg-white/80"
          }`}
        >
          Próximos ({upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`flex-1 cursor-pointer rounded-xl py-3 text-[15px] font-semibold transition ${
            tab === "past" ? "bg-[#B88E2F] text-white shadow-sm" : "text-gray-600 hover:bg-white/80"
          }`}
        >
          Pasados ({past.length})
        </button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[16px] text-amber-900">
          {error}{" "}
          <Link href="/perfil#acceso" className="font-semibold text-[#B88E2F] underline-offset-2 hover:underline">
            Ir a acceso
          </Link>
        </p>
      ) : null}
      {successMessage ? (
        <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[16px] text-emerald-900">
          {successMessage}
        </p>
      ) : null}

      {rows === null ? (
        <p className="py-10 text-center text-[16px] text-gray-500">Cargando…</p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <p className="text-[16px] text-gray-500">
            {tab === "upcoming" ? "No tenés turnos próximos." : "No hay turnos pasados para mostrar."}
          </p>
          {tab === "upcoming" ? (
            <TrackedLink
              href="/turnos"
              trackAction="reservar_turno"
              trackLabel="mis_turnos_empty"
              className="inline-flex h-12 items-center rounded-full bg-[#B88E2F] px-6 text-[16px] font-semibold text-white shadow-md transition active:scale-[0.98]"
            >
              Reservar nuevo turno
            </TrackedLink>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li
              key={r.id}
              className="rounded-[24px] border border-gray-50 bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
            >
              <p className="text-[18px] font-semibold leading-tight text-gray-900">
                <span className="text-[#B88E2F]">
                  {r.timeLocal}
                  <span className="ml-1 text-[15px] font-medium text-[#B88E2F]/80">hs</span>
                </span>
                <span className="text-gray-700"> · {formatDayMonthFromKey(r.dateKey)}</span>
              </p>
              <p className="mt-1 text-[15px] text-gray-500">{r.displayDate}</p>
              <p className="mt-3 text-[17px] font-semibold text-gray-900">{r.treatmentName}</p>
              <p className="mt-0.5 text-[15px] text-gray-500">{r.subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-[13px] font-medium text-gray-700">
                  {reservationStatusLabel(r.reservationStatus)}
                </span>
                {r.source === "panel" ? (
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[13px] font-semibold text-sky-800">
                    Cargado en salón
                  </span>
                ) : null}
              </div>
              {r.reservationStatus === "cancelled" && r.cancelledBy === "panel" ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] leading-snug text-amber-900">
                  Este turno fue cancelado desde el panel del salón.
                </p>
              ) : null}
              {tab === "upcoming" && (r.reservationStatus === "confirmed" || r.reservationStatus === "pending_payment") ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/perfil/mis-turnos/${encodeURIComponent(r.id)}/reprogramar`}
                    className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-[#B88E2F] bg-[#B88E2F]/10 px-4 text-[14px] font-semibold text-[#996515] transition hover:bg-[#B88E2F]/18"
                  >
                    Cambiar horario
                  </Link>
                  <button
                    type="button"
                    disabled={cancellingId === r.id}
                    onClick={() => setCancelConfirmId(r.id)}
                    className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-red-200 bg-red-50 px-4 text-[14px] font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancellingId === r.id ? "Cancelando..." : "Cancelar turno"}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {me === "authed" && list.length > 0 ? (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
          <TrackedLink
            href="/turnos"
            trackAction="reservar_turno"
            trackLabel="mis_turnos_fab"
            className="inline-flex h-11 items-center rounded-full bg-[#B88E2F] px-6 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.98]"
          >
            + Reservar turno
          </TrackedLink>
        </div>
      ) : null}

      {cancelConfirmId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (cancellingId !== cancelConfirmId) {
              setCancelConfirmId(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-gray-100 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-2xl font-bold text-gray-900">Cancelar turno</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-gray-600">
              ¿Estás seguro que deseás cancelar este turno? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelConfirmId(null)}
                disabled={cancellingId === cancelConfirmId}
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 px-4 text-[15px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = cancelConfirmId;
                  if (!id) return;
                  await handleCancelReservation(id);
                  setCancelConfirmId(null);
                }}
                disabled={cancellingId === cancelConfirmId}
                className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-4 text-[15px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                {cancellingId === cancelConfirmId ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
