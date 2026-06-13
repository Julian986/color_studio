"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Hand,
  Lock,
  MessageCircle,
  Palette,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { agendaBlockAppliesToDateKey } from "@/lib/booking/agenda-blocks-shared";
import {
  PANEL_WEEK_LETTERS,
  buildPanelMonthGrid,
  panelMonthTitle,
} from "@/lib/booking/panel-month-grid";
import { panelDurationLabel } from "@/lib/treatments/catalog";

export type PanelReservation = {
  id: string;
  treatmentId: string;
  treatmentName: string;
  subtitle: string;
  category: string;
  dateKey: string;
  timeLocal: string;
  displayDate: string;
  customerName: string;
  customerPhone: string;
  reservationStatus: string;
  paymentStatus: string;
  /** Quién canceló (solo si `reservationStatus` es cancelled). */
  cancelledBy?: "panel" | "customer" | "whatsapp" | null;
  source?: string;
  startsAt: string;
  createdAt: string;
};

export type PanelAgendaBlock = {
  id: string;
  anchorDateKey: string;
  timeLocal: string;
  durationMinutes: number;
  scope: string;
  recurrence: { type: "weekly"; untilDateKey?: string | null } | null;
  notes?: string | null;
};

type DayRow = { kind: "reservation"; item: PanelReservation } | { kind: "block"; item: PanelAgendaBlock };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayYmd(local: Date) {
  return `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;
}

function weekdayLongFromKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const w = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(dt);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function dayLongFromKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(dt);
}

function digitsOnlyPhone(s: string) {
  return s.replace(/\D/g, "");
}

/** Dígitos internacionales para wa.me (Argentina centrado, sin +). */
function whatsAppDigitsFromStoredPhone(raw: string): string | null {
  const d = digitsOnlyPhone(raw);
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("54")) return d;
  if (d.length === 11 && d.startsWith("9")) return `54${d}`;
  if (d.length === 10) return `549${d}`;
  return `54${d}`;
}

function whatsAppChatUrl(
  phoneRaw: string,
  opts: { customerName: string; displayDate: string; timeLocal: string; treatmentName: string },
): string | null {
  const n = whatsAppDigitsFromStoredPhone(phoneRaw);
  if (!n) return null;
  const name = opts.customerName.trim();
  const greet = name ? `Hola ${name}` : "Hola";
  const text = `${greet}, te escribimos desde Colorstudio Moscardini por tu turno: ${opts.treatmentName}, ${opts.displayDate} a las ${opts.timeLocal}.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

function ServiceIcon({ category }: { category: string }) {
  const cls = "h-5 w-5 shrink-0 text-[var(--premium-gold)]";
  if (category === "Cortes y peinado") return <Scissors className={cls} strokeWidth={1.85} />;
  if (category === "Color") return <Palette className={cls} strokeWidth={1.85} />;
  if (category === "Tratamiento") return <Sparkles className={cls} strokeWidth={1.85} />;
  if (category === "Láser") return <Sparkles className={cls} strokeWidth={1.85} />;
  if (category === "Facial") return <Hand className={cls} strokeWidth={1.85} />;
  if (category === "Corporal") return <Hand className={cls} strokeWidth={1.85} />;
  return <Hand className={cls} strokeWidth={1.85} />;
}

function StatusBadge({
  reservationStatus,
  paymentStatus,
  cancelledBy,
}: {
  reservationStatus: string;
  paymentStatus: string;
  cancelledBy?: "panel" | "customer" | "whatsapp" | null;
}) {
  if (reservationStatus === "cancelled") {
    const detail =
      cancelledBy === "panel"
        ? "Desde el panel"
        : cancelledBy === "customer"
          ? "Desde la web (cliente)"
          : cancelledBy === "whatsapp"
            ? "Desde WhatsApp"
            : null;
    return (
      <span className="inline-flex max-w-full flex-col gap-0.5">
        <span className="inline-block w-fit rounded-full bg-red-500/12 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-red-300/95">
          Cancelada
        </span>
        {detail ? (
          <span className="text-[10px] font-medium leading-tight text-red-200/75">{detail}</span>
        ) : null}
      </span>
    );
  }
  if (reservationStatus === "pending_payment" || paymentStatus === "pending") {
    return (
      <span className="inline-block rounded-full bg-amber-500/14 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-300/90">
        Pendiente
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-emerald-500/14 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-300/95">
      Confirmada
    </span>
  );
}

function scopeLabel(scope: string) {
  if (scope === "salon") return "Todo el salón";
  if (scope === "chair_1") return "Silla 1";
  if (scope === "chair_2") return "Silla 2";
  return scope;
}

export function PanelTurnosDashboard() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [list, setList] = useState<PanelReservation[]>([]);
  const [agendaBlocks, setAgendaBlocks] = useState<PanelAgendaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);
  const [cancelConfirmReservationId, setCancelConfirmReservationId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const grid = useMemo(() => buildPanelMonthGrid(year, month), [year, month]);
  const todayKey = todayYmd(now);

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const key = todayYmd(now);
    const [y, m] = key.split("-").map(Number);
    if (y === now.getFullYear() && m === now.getMonth() + 1) return key;
    return `${year}-${pad2(month)}-01`;
  });

  useEffect(() => {
    const curFirst = `${year}-${pad2(month)}-01`;
    const curLast = new Date(year, month, 0).getDate();
    const curLastKey = `${year}-${pad2(month)}-${pad2(curLast)}`;
    if (selectedKey >= curFirst && selectedKey <= curLastKey) return;

    if (todayKey >= curFirst && todayKey <= curLastKey) {
      setSelectedKey(todayKey);
      return;
    }
    setSelectedKey(curFirst);
  }, [year, month, selectedKey, todayKey]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/panel-turnos/reservations?year=${year}&month=${month}`);
        const data = (await res.json()) as {
          reservations?: PanelReservation[];
          agendaBlocks?: PanelAgendaBlock[];
          error?: string;
        };
        if (!res.ok) {
          if (res.status === 401) router.refresh();
          return;
        }
        if (alive) {
          setList(data.reservations ?? []);
          setAgendaBlocks(data.agendaBlocks ?? []);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [year, month, router, refreshTick]);

  const visibleReservations = useMemo(() => {
    if (showCancelled) return list;
    return list.filter((r) => r.reservationStatus !== "cancelled");
  }, [list, showCancelled]);

  const combinedCountsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of visibleReservations) {
      m.set(r.dateKey, (m.get(r.dateKey) ?? 0) + 1);
    }
    for (const cell of grid) {
      const key = cell.dateKey;
      for (const b of agendaBlocks) {
        if (agendaBlockAppliesToDateKey(b, key)) {
          m.set(key, (m.get(key) ?? 0) + 1);
        }
      }
    }
    return m;
  }, [visibleReservations, agendaBlocks, grid]);

  const cancelledCountSelectedDay = useMemo(
    () => list.filter((r) => r.dateKey === selectedKey && r.reservationStatus === "cancelled").length,
    [list, selectedKey],
  );
  const cancelledLabel = cancelledCountSelectedDay === 1 ? "Cancelada" : "Canceladas";

  const dayRows = useMemo(() => {
    const rows: DayRow[] = [];
    for (const r of visibleReservations) {
      if (r.dateKey === selectedKey) rows.push({ kind: "reservation", item: r });
    }
    for (const b of agendaBlocks) {
      if (agendaBlockAppliesToDateKey(b, selectedKey)) {
        rows.push({ kind: "block", item: b });
      }
    }
    rows.sort((a, b) => {
      const ta = a.item.timeLocal;
      const tb = b.item.timeLocal;
      return ta.localeCompare(tb);
    });
    return rows;
  }, [visibleReservations, agendaBlocks, selectedKey]);

  const reloadMonth = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  async function handleDeleteBlock(blockId: string) {
    if (!window.confirm("¿Eliminar este bloqueo de agenda?")) return;
    const res = await fetch(`/api/panel-turnos/agenda-blocks?id=${encodeURIComponent(blockId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) return;
    reloadMonth();
  }

  async function handleCancelReservation(reservationId: string) {
    setCancellingReservationId(reservationId);
    try {
      const res = await fetch(`/api/panel-turnos/reservations/${encodeURIComponent(reservationId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      reloadMonth();
    } finally {
      setCancellingReservationId(null);
    }
  }

  async function handleLogout() {
    setLogoutBusy(true);
    await fetch("/api/panel-turnos/logout", { method: "POST" });
    router.refresh();
    setLogoutBusy(false);
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
      return;
    }
    setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
      return;
    }
    setMonth((m) => m + 1);
  }

  return (
    <div className="min-h-screen bg-[#111111] pb-24 text-[var(--soft-gray)]">
      <div className="mx-auto max-w-md px-4">
        <header className="flex items-start justify-between gap-4 pt-6 pb-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-orange)] to-[var(--premium-gold)] shadow-[0_10px_28px_rgba(228,202,105,0.28)]">
              <Sparkles className="h-6 w-6 text-[var(--on-accent)]" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-heading text-[18px] leading-tight text-[var(--premium-gold)]">Colorstudio Moscardini</h1>
              <p className="text-[12px] leading-relaxed text-[var(--soft-gray)]/58">Peluquería</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/panel-turnos/bloqueo"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-amber-500/35 bg-[#171717] text-amber-200/95 shadow-[0_6px_22px_rgba(0,0,0,0.35)] hover:bg-[#1d1d1d]"
              aria-label="Bloquear franja de agenda"
            >
              <Lock className="h-5 w-5" strokeWidth={2.25} />
            </Link>
            <Link
              href="/panel-turnos/nuevo"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[var(--premium-gold)]/35 bg-[#171717] text-[var(--premium-gold)] shadow-[0_6px_22px_rgba(0,0,0,0.35)] hover:bg-[#1d1d1d]"
              aria-label="Agregar turno"
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} />
            </Link>
          </div>
        </header>

        <section className="mt-5 rounded-[28px] border border-white/8 bg-[#171717] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.38)]">
          <div className="relative mb-3 flex items-center justify-center px-10">
            <button
              type="button"
              onClick={prevMonth}
              className="absolute left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--soft-gray)]/70 hover:bg-white/5 hover:text-[var(--soft-gray)]"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-center text-[15px] font-semibold capitalize tracking-tight text-[var(--soft-gray)]">
              {panelMonthTitle(year, month)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="absolute right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-[var(--soft-gray)]/70 hover:bg-white/5 hover:text-[var(--soft-gray)]"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold tracking-wide text-[var(--soft-gray)]/45">
            {PANEL_WEEK_LETTERS.map((L) => (
              <div key={L} className="py-2">
                {L}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {grid.map((cell) => {
              const sel = cell.dateKey === selectedKey;
              const count = combinedCountsByDay.get(cell.dateKey) ?? 0;
              const inMonth = cell.inMonth;

              return (
                <button
                  key={`${cell.dateKey}-${cell.inMonth}-${cell.day}`}
                  type="button"
                  onClick={() => setSelectedKey(cell.dateKey)}
                  className="flex w-full cursor-pointer flex-col items-center py-1"
                >
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold leading-none transition",
                      inMonth ? "text-[var(--soft-gray)]" : "text-[var(--soft-gray)]/30",
                      sel
                        ? "bg-gradient-to-br from-[var(--accent-coral)] to-[var(--accent-orange)] text-white shadow-[0_8px_24px_rgba(182,75,84,0.35)]"
                        : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    {cell.day}
                  </span>
                  <span className="mt-0.5 flex h-2 items-center justify-center">
                    {count > 0 ? (
                      <span className="block h-1 w-1 rounded-full bg-[var(--premium-gold)]" />
                    ) : (
                      <span className="block h-1 w-1 rounded-full bg-transparent" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[22px] font-bold leading-tight tracking-tight text-[var(--soft-gray)]">
              {weekdayLongFromKey(selectedKey)}
            </p>
            <p className="mt-0.5 text-[14px] text-[var(--soft-gray)]/55">{dayLongFromKey(selectedKey)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className={[
                "flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-[13px] transition",
                showCancelled
                  ? "border-red-400/35 bg-red-500/12 text-red-200/95"
                  : "border-white/10 bg-[#171717] text-[var(--soft-gray)]/88 hover:bg-[#1d1d1d]",
              ].join(" ")}
              aria-pressed={showCancelled}
              aria-label={showCancelled ? "Ocultar canceladas" : "Mostrar canceladas"}
              title={showCancelled ? "Ocultar canceladas" : "Mostrar canceladas"}
            >
              <span className="font-semibold">{cancelledCountSelectedDay}</span>
              <span className="font-semibold">{cancelledLabel}</span>
            </button>
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#171717] px-3 py-2 text-[13px] text-[var(--soft-gray)]/88">
              <CalendarDays className="h-4 w-4 text-[var(--premium-gold)]" strokeWidth={1.75} />
              <span className="font-semibold">
                {dayRows.length} {dayRows.length === 1 ? "evento" : "eventos"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <p className="py-10 text-center text-[14px] text-[var(--soft-gray)]/55">Cargando agenda…</p>
          ) : dayRows.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-[var(--soft-gray)]/55">
              No hay turnos ni bloqueos este día.
            </p>
          ) : (
            dayRows.map((row) => {
              if (row.kind === "block") {
                const b = row.item;
                const weekly = b.recurrence?.type === "weekly";
                return (
                  <article
                    key={`block-${b.id}`}
                    className="rounded-[20px] border border-amber-500/25 bg-[#171717] px-4 py-4 shadow-[0_10px_32px_rgba(0,0,0,0.32)]"
                  >
                    <div className="flex gap-3">
                      <div className="w-[52px] shrink-0 text-left">
                        <p className="text-[15px] font-bold leading-none text-amber-100/95">{b.timeLocal}</p>
                        <p className="mt-2 text-[11px] leading-none text-[var(--soft-gray)]/48">{b.durationMinutes} min</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-2">
                          <Lock className="h-5 w-5 shrink-0 text-amber-300/90" strokeWidth={2} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold leading-snug text-[var(--soft-gray)]">Bloqueo de agenda</p>
                            <p className="mt-1 text-[12px] text-[var(--soft-gray)]/58">{scopeLabel(b.scope)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="inline-block rounded-full bg-amber-500/18 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-100/95">
                                Bloqueo
                              </span>
                              {weekly ? (
                                <span className="inline-block rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--soft-gray)]/78">
                                  Semanal
                                  {b.recurrence?.untilDateKey ? ` hasta ${b.recurrence.untilDateKey}` : ""}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void handleDeleteBlock(b.id)}
                                className="cursor-pointer text-[11px] font-semibold text-red-300/90 underline-offset-2 hover:underline"
                              >
                                Eliminar
                              </button>
                            </div>
                            {b.notes ? (
                              <p className="mt-2 text-[12px] leading-snug text-[var(--soft-gray)]/55">{b.notes}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
              const r = row.item;
              const waUrl = whatsAppChatUrl(r.customerPhone, {
                customerName: r.customerName,
                displayDate: r.displayDate,
                timeLocal: r.timeLocal,
                treatmentName: r.treatmentName,
              });
              return (
                <article
                  key={r.id}
                  className="relative rounded-[20px] border border-white/8 bg-[#171717] px-4 py-4 shadow-[0_10px_32px_rgba(0,0,0,0.32)]"
                >
                  {r.reservationStatus === "confirmed" || r.reservationStatus === "pending_payment" ? (
                    <button
                      type="button"
                      onClick={() => setCancelConfirmReservationId(r.id)}
                      disabled={cancellingReservationId === r.id}
                      aria-label="Cancelar turno"
                      title="Cancelar turno"
                      className="absolute top-3 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-400/35 bg-red-500/10 text-red-200/95 transition hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                    </button>
                  ) : null}
                  <div className="flex gap-3">
                    <div className="w-[52px] shrink-0 text-left">
                      <p className="text-[15px] font-bold leading-none text-[var(--soft-gray)]">{r.timeLocal}</p>
                      <p className="mt-2 text-[11px] leading-none text-[var(--soft-gray)]/48">
                        {panelDurationLabel(r.treatmentName, r.category)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1 pr-10">
                      <div className="flex gap-2">
                        <ServiceIcon category={r.category} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold leading-snug text-[var(--soft-gray)]">{r.treatmentName}</p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--soft-gray)]/58">
                            <User className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{r.customerName || "Cliente"}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge
                              reservationStatus={r.reservationStatus}
                              paymentStatus={r.paymentStatus}
                              cancelledBy={r.cancelledBy ?? null}
                            />
                            {r.source === "panel" ? (
                              <span className="inline-block rounded-full bg-sky-500/14 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-sky-200/95">
                                Manual
                              </span>
                            ) : null}
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#25D366]/16 px-3 py-1.5 text-[11px] font-semibold text-[#6ee7a5] ring-1 ring-[#25D366]/35 transition hover:bg-[#25D366]/24"
                              >
                                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                                WhatsApp
                              </a>
                            ) : null}
                            {r.reservationStatus === "confirmed" || r.reservationStatus === "pending_payment" ? (
                              <Link
                                href={`/panel-turnos/reprogramar/${encodeURIComponent(r.id)}`}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--premium-gold)]/35 bg-[var(--premium-gold)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--premium-gold)] transition hover:bg-[var(--premium-gold)]/16"
                              >
                                Reprogramar
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutBusy}
            className="cursor-pointer text-[13px] text-[var(--soft-gray)]/50 underline-offset-4 hover:text-[var(--premium-gold)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar sesión del panel
          </button>
        </div>
      </div>
      {cancelConfirmReservationId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
          onClick={() => {
            if (cancellingReservationId !== cancelConfirmReservationId) {
              setCancelConfirmReservationId(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#171717] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-[20px] text-[var(--soft-gray)]">Cancelar turno</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--soft-gray)]/78">
              ¿Estás seguro que deseás cancelar este turno? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmReservationId(null)}
                disabled={cancellingReservationId === cancelConfirmReservationId}
                className="inline-flex h-9 items-center rounded-xl border border-white/15 px-3 text-[12px] font-semibold text-[var(--soft-gray)]/85 transition hover:bg-white/5 disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = cancelConfirmReservationId;
                  if (!id) return;
                  await handleCancelReservation(id);
                  setCancelConfirmReservationId(null);
                }}
                disabled={cancellingReservationId === cancelConfirmReservationId}
                className="inline-flex h-9 items-center rounded-xl border border-red-400/45 bg-red-500/12 px-3 text-[12px] font-semibold text-red-200/95 transition hover:bg-red-500/18 disabled:opacity-60"
              >
                {cancellingReservationId === cancelConfirmReservationId ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
