"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  panelBackBtn,
  panelCard,
  panelContainer,
  panelDayDefault,
  panelDayOutside,
  panelDaySelected,
  panelInput,
  panelLabel,
  panelPage,
  panelPrimaryBtn,
} from "@/components/panel/panel-ui";
import { trackPanelClick } from "@/lib/analytics/track";
import {
  PANEL_WEEK_LETTERS,
  buildPanelMonthGrid,
  panelMonthTitle,
} from "@/lib/booking/panel-month-grid";
import { formatSalonDisplayDate, getAvailableTimesForDate } from "@/lib/booking/salon-availability";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmdToYearMonth(ymd: string): { y: number; m: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }
  return { y: Number(m[1]), m: Number(m[2]) };
}

function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

type Scope = "salon" | "chair_1" | "chair_2";

export function PanelBloqueoAgendaClient() {
  const router = useRouter();
  const anchorInit = todayYmd();
  const { y: initY, m: initM } = parseYmdToYearMonth(anchorInit);

  const [anchorDateKey, setAnchorDateKey] = useState(anchorInit);
  const [calYear, setCalYear] = useState(initY);
  const [calMonth, setCalMonth] = useState(initM);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarWrapRef = useRef<HTMLDivElement>(null);

  const [timeLocal, setTimeLocal] = useState("14:00");
  const [endTimeLocal, setEndTimeLocal] = useState("15:30");
  const [scope, setScope] = useState<Scope>("salon");
  const [recurrenceType, setRecurrenceType] = useState<"once" | "weekly">("once");
  const [untilDateKey, setUntilDateKey] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grid = useMemo(() => buildPanelMonthGrid(calYear, calMonth), [calYear, calMonth]);

  useEffect(() => {
    if (!calendarOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (calendarWrapRef.current && !calendarWrapRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [calendarOpen]);

  const durationMinutes = useMemo(() => {
    const start = hhmmToMinutes(timeLocal);
    const end = hhmmToMinutes(endTimeLocal);
    if (start === null || end === null) return 0;
    if (end <= start) return 0;
    return end - start;
  }, [timeLocal, endTimeLocal]);

  const canSubmit = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDateKey)) return false;
    if (!/^\d{2}:\d{2}$/.test(timeLocal) || !/^\d{2}:\d{2}$/.test(endTimeLocal)) return false;
    if (durationMinutes < 15 || durationMinutes > 12 * 60) return false;
    if (recurrenceType === "weekly" && untilDateKey.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(untilDateKey.trim())) {
      return false;
    }
    return true;
  }, [anchorDateKey, timeLocal, endTimeLocal, durationMinutes, recurrenceType, untilDateKey]);

  function openCalendar() {
    const { y, m } = parseYmdToYearMonth(anchorDateKey);
    setCalYear(y);
    setCalMonth(m);
    setCalendarOpen(true);
  }

  function toggleCalendar() {
    if (calendarOpen) {
      setCalendarOpen(false);
    } else {
      openCalendar();
    }
  }

  function prevCalMonth() {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
      return;
    }
    setCalMonth((mo) => mo - 1);
  }

  function nextCalMonth() {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
      return;
    }
    setCalMonth((mo) => mo + 1);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/panel-turnos/agenda-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          anchorDateKey,
          timeLocal,
          durationMinutes,
          scope,
          recurrenceType,
          untilDateKey: recurrenceType === "weekly" && untilDateKey.trim() ? untilDateKey.trim() : null,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      trackPanelClick("bloquear_horario", "saved");
      router.push("/panel-turnos");
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={panelPage}>
      <div className={`${panelContainer} pt-6`}>
        <header className="mb-6 flex items-center gap-3">
          <Link href="/panel-turnos" className={panelBackBtn} aria-label="Volver al panel">
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-[20px] font-bold leading-tight text-gray-900">Bloqueo de agenda</h1>
              <p className="text-[12px] text-gray-500">Marcelo ausente o silla ocupada</p>
            </div>
          </div>
        </header>

        <section className={`space-y-4 overflow-visible ${panelCard} p-4`}>
          <div ref={calendarWrapRef} className="relative">
            <p className={panelLabel} id="fecha-bloqueo-label">
              Fecha (primera ocurrencia)
            </p>
            <button
              type="button"
              id="fecha-bloqueo-trigger"
              aria-labelledby="fecha-bloqueo-label"
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
              onClick={toggleCalendar}
              className="mt-1.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-[15px] text-gray-900 outline-none transition hover:border-gray-300 focus:border-[#B88E2F]/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#B88E2F]" strokeWidth={1.85} />
                <span className="truncate">{formatSalonDisplayDate(anchorDateKey)}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition ${calendarOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>

            {calendarOpen ? (
              <div
                role="dialog"
                aria-label="Elegir fecha"
                className={`absolute z-50 mt-2 w-full ${panelCard} p-4`}
              >
                <div className="relative mb-3 flex items-center justify-center px-10">
                  <button
                    type="button"
                    onClick={prevCalMonth}
                    className="absolute left-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-center text-[15px] font-semibold capitalize tracking-tight text-gray-900">
                    {panelMonthTitle(calYear, calMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={nextCalMonth}
                    className="absolute right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold tracking-wide text-gray-400">
                  {PANEL_WEEK_LETTERS.map((L) => (
                    <div key={L} className="py-2">
                      {L}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-2 text-center">
                  {grid.map((cell) => {
                    const sel = cell.dateKey === anchorDateKey;
                    const hasSlots = getAvailableTimesForDate(cell.dateKey).length > 0;
                    const isDisabled = !cell.inMonth || !hasSlots;
                    return (
                      <button
                        key={`${cell.dateKey}-${cell.inMonth}-${cell.day}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setAnchorDateKey(cell.dateKey);
                          const { y, m } = parseYmdToYearMonth(cell.dateKey);
                          setCalYear(y);
                          setCalMonth(m);
                          setCalendarOpen(false);
                        }}
                        className="flex w-full flex-col items-center py-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold leading-none transition",
                            cell.inMonth ? panelDayDefault : panelDayOutside,
                            sel ? panelDaySelected : "",
                            isDisabled ? "opacity-40" : "",
                          ].join(" ")}
                        >
                          {cell.day}
                        </span>
                        <span className="mt-0.5 block h-2" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label className={panelLabel} htmlFor="startTime">
              Hora de inicio
            </label>
            <input
              id="startTime"
              type="time"
              step={900}
              value={timeLocal}
              onChange={(e) => setTimeLocal(e.target.value)}
              className={panelInput}
            />
          </div>

          <div>
            <label className={panelLabel} htmlFor="endTime">
              Hora de fin
            </label>
            <input
              id="endTime"
              type="time"
              step={900}
              value={endTimeLocal}
              onChange={(e) => setEndTimeLocal(e.target.value)}
              className={panelInput}
            />
            {durationMinutes > 0 && durationMinutes < 15 ? (
              <p className="mt-1 text-[11px] text-amber-700">La franja debe durar al menos 15 minutos.</p>
            ) : null}
            {durationMinutes === 0 && hhmmToMinutes(timeLocal) !== null && hhmmToMinutes(endTimeLocal) !== null ? (
              <p className="mt-1 text-[11px] text-amber-700">La hora de fin tiene que ser posterior a la de inicio.</p>
            ) : null}
          </div>

          <fieldset>
            <legend className={panelLabel}>Alcance</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  { v: "salon" as const, label: "Todo el salón", hint: "Nadie puede reservar en esa franja." },
                  { v: "chair_1" as const, label: "Silla 1", hint: "Solo bloquea una silla, puede haber otra." },
                  { v: "chair_2" as const, label: "Silla 2", hint: "Solo bloquea una silla, puede haber otra." },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.v}
                  className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition ${
                    scope === opt.v ? "border-[#B88E2F]/50 bg-[#B88E2F]/8" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      value={opt.v}
                      checked={scope === opt.v}
                      onChange={() => setScope(opt.v)}
                      className="accent-[#B88E2F]"
                    />
                    <span className="text-[14px] font-medium text-gray-900">{opt.label}</span>
                  </div>
                  <span className="mt-1 pl-6 text-[11px] leading-snug text-gray-500">{opt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={panelLabel}>Recurrencia</legend>
            <div className="mt-2 space-y-2">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 ${
                  recurrenceType === "once" ? "border-[#B88E2F]/50 bg-[#B88E2F]/8" : "border-gray-200 bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="recurrence"
                  checked={recurrenceType === "once"}
                  onChange={() => setRecurrenceType("once")}
                  className="accent-[#B88E2F]"
                />
                <span className="text-[14px] text-gray-900">Solo esta fecha</span>
              </label>
              <label
                className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-3 py-2.5 ${
                  recurrenceType === "weekly" ? "border-[#B88E2F]/50 bg-[#B88E2F]/8" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrenceType === "weekly"}
                    onChange={() => setRecurrenceType("weekly")}
                    className="accent-[#B88E2F]"
                  />
                  <span className="text-[14px] text-gray-900">Cada semana (mismo día de la semana)</span>
                </div>
                {recurrenceType === "weekly" ? (
                  <div className="pl-6">
                    <label className="text-[11px] text-gray-500" htmlFor="untilDate">
                      Hasta (opcional, dejar vacío = sin fin)
                    </label>
                    <input
                      id="untilDate"
                      type="date"
                      value={untilDateKey}
                      onChange={(e) => setUntilDateKey(e.target.value)}
                      className={panelInput}
                    />
                  </div>
                ) : null}
              </label>
            </div>
          </fieldset>

          <div>
            <label className={panelLabel} htmlFor="notes">
              Nota interna (opcional)
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Marcelo fuera / capacitación"
              className={`${panelInput} resize-none text-[14px]`}
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() => void handleSubmit()}
            className={panelPrimaryBtn}
          >
            {submitting ? "Guardando…" : "Guardar bloqueo"}
          </button>
        </section>
      </div>
    </div>
  );
}
