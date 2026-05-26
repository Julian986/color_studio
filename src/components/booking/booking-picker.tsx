"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ColorStudioServicePickerSheet } from "@/components/booking/color-studio-service-picker-sheet";
import {
  SALON_TREATMENT_OPTIONS,
  buildSalonCalendarItems,
  formatSalonDisplayDate,
  getAvailableTimesForDate,
  salonMonthNames,
  salonWeekdayLabels,
} from "@/lib/booking/salon-availability";
import { isArgentinaPublicHoliday } from "@/lib/booking/argentina-holidays";
import { minPublicBookableDateKey } from "@/lib/booking/public-slot-lead";
import {
  findSalonTreatmentById,
  normalizeServiceIds,
  primaryTreatmentIdFromServiceIds,
} from "@/lib/treatments/catalog";
import type { PanelSlotOverlapHit } from "@/lib/booking/slot-overlap";

export type BookingPickerProps = {
  selectedTreatmentId: string;
  onTreatmentIdChange: (id: string) => void;
  selectedDate: string;
  onDateChange: (dateKey: string) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  /** Si se pasa, define qué horarios mostrar (ej. reserva pública con margen de 60 min en “hoy”). */
  resolveTimeSlots?: (dateKey: string) => string[];
  /**
   * Horarios ya resueltos en servidor (solapes, reglas). Solo aplica al `selectedDate` actual.
   * `undefined`: usar `resolveTimeSlots` / plantilla. `null`: cargando.
   */
  remoteTimeSlots?: string[] | null;
  /**
   * `public`: reserva web.
   * `panel`: reprogramar / panel con horario web.
   * `panel_nuevo`: alta en /panel-turnos/nuevo (horario ampliado hasta las 18:00).
   */
  bookingContext?: "public" | "panel" | "panel_nuevo";
  bookingFocusRef?: React.RefObject<HTMLDivElement | null>;
  treatmentFirstHintVisible: boolean;
  onTreatmentFirstHintVisible: (visible: boolean) => void;
  selectedCountLabel?: string;
  selectedDurationLabel?: string;
  summaryTitle?: string;
  monthAvailabilityServiceIds?: string[];
  multiSelect?: boolean;
  selectedTreatmentIds?: string[];
  onToggleTreatmentId?: (id: string) => void;
  onClearTreatmentIds?: () => void;
  comboHintText?: string;
  comboDurationLabel?: string;
  comboAlertText?: string | null;
  /** Varios servicios en la misma visita (turnos públicos y panel). */
  selectedServiceIds?: string[];
  onServiceIdsChange?: (ids: string[]) => void;
  /** Solo panel: turnos que se superponen con otros (avisos visuales). */
  panelSlotOverlaps?: Record<string, PanelSlotOverlapHit[]>;
};

export function BookingPicker({
  selectedTreatmentId,
  onTreatmentIdChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  resolveTimeSlots,
  remoteTimeSlots,
  bookingContext = "public",
  bookingFocusRef,
  treatmentFirstHintVisible,
  onTreatmentFirstHintVisible,
  selectedCountLabel,
  selectedDurationLabel,
  summaryTitle,
  monthAvailabilityServiceIds = [],
  multiSelect = false,
  selectedTreatmentIds = [],
  onToggleTreatmentId,
  onClearTreatmentIds,
  comboHintText,
  comboDurationLabel,
  comboAlertText,
  selectedServiceIds = [],
  onServiceIdsChange,
  panelSlotOverlaps = {},
}: BookingPickerProps) {
  const isPanelContext = bookingContext === "panel" || bookingContext === "panel_nuevo";
  const slotsApiScope =
    bookingContext === "panel_nuevo"
      ? "panel_nuevo"
      : bookingContext === "panel"
        ? "panel"
        : "public";
  const multiService = Boolean(onServiceIdsChange);
  const effectiveServiceIds = multiService
    ? normalizeServiceIds(selectedServiceIds)
    : selectedTreatmentId
      ? [selectedTreatmentId]
      : [];
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  /** `undefined`: sin servicio o sin datos; `null`: cargando; objeto: hay al menos un hueco ese día para el servicio. */
  const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean> | null | undefined>(undefined);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [draftServiceIds, setDraftServiceIds] = useState<string[]>([]);

  const hasServiceSelection = effectiveServiceIds.length > 0;
  const summaryTreatments = useMemo(
    () =>
      effectiveServiceIds.flatMap((id) => {
        const opt = SALON_TREATMENT_OPTIONS.find((o) => o.id === id);
        return opt ? [opt] : [];
      }),
    [effectiveServiceIds],
  );
  const selectedTreatment = summaryTreatments[0];
  const selectedTreatmentDetail = useMemo(
    () => findSalonTreatmentById(primaryTreatmentIdFromServiceIds(effectiveServiceIds)),
    [effectiveServiceIds],
  );
  const calendarItems = useMemo(
    () => buildSalonCalendarItems(visibleMonthDate.getFullYear(), visibleMonthDate.getMonth()),
    [visibleMonthDate],
  );
  const visibleMonthLabel = `${salonMonthNames[visibleMonthDate.getMonth()]} ${visibleMonthDate.getFullYear()}`;
  const minPublicDateKey =
    bookingContext === "public" ? minPublicBookableDateKey() : null;

  useEffect(() => {
    const availIds = monthAvailabilityServiceIds.length > 0 ? monthAvailabilityServiceIds : effectiveServiceIds;
    const primaryId = primaryTreatmentIdFromServiceIds(availIds);
    if (!primaryId.trim() && availIds.length === 0) {
      setMonthAvailability(undefined);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setMonthAvailability(null);
    const y = visibleMonthDate.getFullYear();
    const m = visibleMonthDate.getMonth();
    const q = new URLSearchParams({
      year: String(y),
      monthIndex: String(m),
      treatmentId: primaryId,
      scope: slotsApiScope,
    });
    if (availIds.length > 0) {
      q.set("serviceIds", availIds.join(","));
    }
    fetch(`/api/booking/month-availability?${q.toString()}`, {
      credentials: "same-origin",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ availability?: Record<string, boolean> }>;
      })
      .then((data) => {
        if (cancelled) return;
        const raw = data.availability;
        setMonthAvailability(typeof raw === "object" && raw !== null ? raw : undefined);
      })
      .catch(() => {
        if (!cancelled) setMonthAvailability(undefined);
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [effectiveServiceIds, visibleMonthDate, bookingContext, monthAvailabilityServiceIds]);

  useEffect(() => {
    if (minPublicDateKey && selectedDate && selectedDate < minPublicDateKey) {
      onDateChange("");
      onTimeChange("");
    }
  }, [minPublicDateKey, onDateChange, onTimeChange, selectedDate]);

  useEffect(() => {
    if (isPanelContext) return;
    if (!selectedDate || !hasServiceSelection) return;
    if (monthAvailability === undefined || monthAvailability === null) return;
    if (monthAvailability[selectedDate] === false) {
      onDateChange("");
      onTimeChange("");
    }
  }, [isPanelContext, monthAvailability, onDateChange, onTimeChange, selectedDate, hasServiceSelection]);

  const useRemoteSlots = remoteTimeSlots !== undefined;
  const slotsLoading = useRemoteSlots && selectedDate && remoteTimeSlots === null;
  const availableTimes = selectedDate
    ? useRemoteSlots
      ? remoteTimeSlots === null
        ? []
        : remoteTimeSlots
      : resolveTimeSlots
        ? resolveTimeSlots(selectedDate)
        : getAvailableTimesForDate(selectedDate)
    : [];
  const isSelectedDateHoliday = Boolean(selectedDate && isArgentinaPublicHoliday(selectedDate));
  const selectedOverlapHits = selectedTime ? (panelSlotOverlaps[selectedTime] ?? []) : [];
  const hasSelectedOverlap = isPanelContext && selectedOverlapHits.length > 0;

  const activeStep = !hasServiceSelection
    ? 1
    : !selectedDate
      ? 2
      : !selectedTime
        ? 3
        : 4;

  const openTreatmentModal = () => {
    setDraftServiceIds([...effectiveServiceIds]);
    setIsTreatmentModalOpen(true);
  };

  const closeTreatmentModal = () => {
    setIsTreatmentModalOpen(false);
    setDraftServiceIds([]);
  };

  const confirmServices = (ids: string[]) => {
    const normalized = normalizeServiceIds(ids);
    if (multiService && onServiceIdsChange) {
      onServiceIdsChange(normalized);
      onTreatmentIdChange(primaryTreatmentIdFromServiceIds(normalized));
    } else {
      onTreatmentIdChange(primaryTreatmentIdFromServiceIds(normalized));
    }
    if (multiSelect && onToggleTreatmentId) {
      for (const id of normalized) onToggleTreatmentId(id);
    }
    closeTreatmentModal();
  };

  const displaySummaryTitle =
    summaryTitle ??
    (summaryTreatments.length > 1
      ? summaryTreatments.map((t) => t.name).join(" + ")
      : summaryTreatments[0]?.name);

  return (
    <>
      <section className="space-y-2">
        <button
          type="button"
          onClick={openTreatmentModal}
          className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border bg-[#171717] px-4 py-3 text-left transition-all ${
            activeStep === 1
              ? "border-[var(--premium-gold)] shadow-[0_0_0_1px_rgba(228,202,105,0.22),0_0_22px_rgba(206,120,50,0.18)]"
              : "border-white/8"
          }`}
        >
          <div>
            <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Paso 1</p>
            <p className="mt-1 text-[14px] text-[var(--soft-gray)]">
              {displaySummaryTitle ?? (multiService ? "Elegí servicios" : "Elegí servicio")}
            </p>
            {selectedCountLabel ? (
              <p className="mt-1 text-[11px] text-[var(--soft-gray)]/55">{selectedCountLabel}</p>
            ) : summaryTreatments.length > 1 ? (
              <p className="mt-1 text-[11px] text-[var(--soft-gray)]/55">
                {summaryTreatments.length} servicios en la misma visita
              </p>
            ) : selectedTreatment ? (
              <p className="mt-1 text-[11px] text-[var(--soft-gray)]/55">
                {selectedTreatmentDetail?.priceLabel
                  ? `${selectedTreatmentDetail.priceLabel} · ${selectedTreatment.subtitle}`
                  : selectedTreatment.subtitle}
              </p>
            ) : null}
            {selectedDurationLabel ? (
              <div className="mt-2 inline-flex items-center rounded-full border border-[var(--premium-gold)]/55 bg-[var(--premium-gold)]/12 px-2.5 py-1">
                <span className="text-[11px] font-semibold tracking-[0.02em] text-[var(--premium-gold)]">
                  {selectedDurationLabel}
                </span>
              </div>
            ) : null}
            {activeStep === 1 && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--premium-gold)]/92">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--premium-gold)]" />
                <span>Comenzá seleccionando el servicio</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--soft-gray)]/60" strokeWidth={1.8} />
        </button>

        <div
          className={`flex items-center justify-between rounded-2xl border bg-[#171717] px-4 py-3 transition-all ${
            activeStep === 2
              ? "border-[var(--premium-gold)] shadow-[0_0_0_1px_rgba(228,202,105,0.22),0_0_22px_rgba(206,120,50,0.18)]"
              : "border-white/8"
          }`}
        >
          <div>
            <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Paso 2</p>
            <p className="mt-1 text-[14px] text-[var(--soft-gray)]">
              {selectedDate ? formatSalonDisplayDate(selectedDate) : "Elegí día"}
            </p>
            {activeStep === 2 && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--premium-gold)]/92">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--premium-gold)]" />
                <span>Ahora elegí una fecha disponible</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 rotate-90 text-[var(--soft-gray)]/60" strokeWidth={1.8} />
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-[24px] border border-white/8 bg-[#e4c48f] p-3 text-[#2c241b] shadow-[0_12px_26px_rgba(0,0,0,0.36)]">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            className="cursor-pointer rounded-lg p-1 text-[#7f6a45] hover:bg-black/10"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <h2 className="flex items-center gap-2 text-[18px] leading-none font-heading">
            {visibleMonthLabel}
            {hasServiceSelection && monthAvailability === null ? (
              <span
                className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#7f6a45]/90"
                aria-hidden
              />
            ) : null}
          </h2>
          <button
            type="button"
            onClick={() =>
              setVisibleMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            className="cursor-pointer rounded-lg p-1 text-[#7f6a45] hover:bg-black/10"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        {isPanelContext && hasServiceSelection ? (
          <p className="mb-2 text-center text-[10px] leading-relaxed text-amber-200/75">
            {bookingContext === "panel_nuevo"
              ? "Horario ampliado hasta las 18:00. Podés cargar turnos encimados; el punto ámbar avisa si coincide con otro."
              : "En el panel podés elegir cualquier horario del día, aunque ya haya turnos. El punto ámbar avisa si coincide con otro."}
          </p>
        ) : null}

        {treatmentFirstHintVisible ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-2 rounded-xl border border-[#8a7548]/55 bg-[#fff9ec]/97 px-3 py-2.5 text-center text-[12px] leading-snug text-[#2c241b] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
          >
            <span className="font-semibold">Primero elegí un servicio</span>
            <span className="text-[#3b3224]"> (paso 1) para poder elegir el día.</span>
          </p>
        ) : null}

        <div
          className="grid grid-cols-7 gap-y-2 text-center"
          aria-busy={Boolean(hasServiceSelection && monthAvailability === null)}
        >
          {salonWeekdayLabels.map((label) => (
            <div key={label} className="text-[10px] tracking-[0.08em] text-[#7f7364]">
              {label}
            </div>
          ))}
          {calendarItems.map((day) => {
            const isSelected = day.value === selectedDate;
            const isBeforeMinPublic =
              Boolean(minPublicDateKey && day.value < minPublicDateKey);
            const dayOpen = day.isAvailable && !isBeforeMinPublic;
            const monthAvailReady = monthAvailability !== undefined && monthAvailability !== null;
            const fullyBooked =
              !isPanelContext &&
              Boolean(hasServiceSelection) &&
              monthAvailReady &&
              day.isCurrentMonth &&
              dayOpen &&
              monthAvailability[day.value] === false;
            const isDisabled = !day.isCurrentMonth || !dayOpen || fullyBooked;

            return (
              <button
                key={day.value}
                type="button"
                disabled={isDisabled}
                title={
                  fullyBooked
                    ? "Sin cupos para este servicio (ocupado o bloqueado)."
                    : !dayOpen && day.isCurrentMonth
                      ? isBeforeMinPublic
                        ? "Los turnos web se reservan desde mañana."
                        : "Día no disponible (cerrado o feriado)."
                      : undefined
                }
                aria-label={
                  fullyBooked
                    ? `${day.dayNumber}, sin cupos`
                    : !dayOpen && day.isCurrentMonth
                      ? `${day.dayNumber}, no disponible`
                      : undefined
                }
                onClick={() => {
                  if (!selectedTreatment) {
                    onTreatmentFirstHintVisible(true);
                    return;
                  }
                  onDateChange(day.value);
                  onTimeChange("");
                  requestAnimationFrame(() => {
                    bookingFocusRef?.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                }}
                className={`mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[12px] transition-colors disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-[#1a1a1a] text-[#c89b56] shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
                    : fullyBooked
                      ? "bg-[#c9b89a]/55 text-[#5c4f3d] line-through decoration-[#6b5a45]"
                      : !day.isCurrentMonth
                        ? "text-[#cfbea8]/45"
                        : dayOpen
                          ? "bg-[#eed7ae] text-[#3b2f22]"
                          : "text-[#897a67]"
                }`}
              >
                {day.dayNumber}
              </button>
            );
          })}
        </div>
      </section>

      <div ref={bookingFocusRef} className="mt-4">
        <section>
          <div
            className={`flex items-center justify-between rounded-2xl border bg-[#171717] px-4 py-3 transition-all ${
              activeStep === 3
                ? "border-[var(--premium-gold)] shadow-[0_0_0_1px_rgba(228,202,105,0.22),0_0_22px_rgba(206,120,50,0.18)]"
                : "border-white/8"
            }`}
          >
            <div>
              <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Paso 3</p>
              <p className="mt-1 text-[14px] text-[var(--soft-gray)]">
                {selectedTime ? `Horario elegido: ${selectedTime}` : "Elegí horario"}
              </p>
              {activeStep === 3 && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--premium-gold)]/92">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--premium-gold)]" />
                  <span>Seleccioná un horario para continuar</span>
                </div>
              )}
              {hasSelectedOverlap ? (
                <p className="mt-2 rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-[11px] leading-snug text-amber-100/92">
                  Turno encimado: coincide con{" "}
                  {selectedOverlapHits.map((h) => `${h.customerName} (${h.treatmentName})`).join(", ")}.
                  Solo vos podés cargarlo desde el panel.
                </p>
              ) : null}
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--soft-gray)]/60" strokeWidth={1.8} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {slotsLoading ? (
              <div className="col-span-2 rounded-2xl border border-white/8 bg-[#171717] px-4 py-5 text-center text-[13px] text-[var(--soft-gray)]/68">
                Cargando horarios…
              </div>
            ) : availableTimes.length > 0 ? (
              availableTimes.map((time) => {
                const isActive = time === selectedTime;
                const overlapHits = isPanelContext ? panelSlotOverlaps[time] : undefined;
                const hasOverlap = Boolean(overlapHits && overlapHits.length > 0);
                return (
                  <button
                    key={time}
                    type="button"
                    title={
                      hasOverlap
                        ? `Encima de: ${overlapHits!.map((h) => `${h.customerName} · ${h.treatmentName}`).join("; ")}`
                        : undefined
                    }
                    onClick={() => onTimeChange(time)}
                    className={`relative h-11 cursor-pointer rounded-xl border text-[16px] transition-colors ${
                      isActive
                        ? hasOverlap
                          ? "border-amber-400 bg-[rgba(245,158,11,0.18)] text-amber-100"
                          : "border-[var(--premium-gold)] bg-[rgba(206,120,50,0.14)] text-[var(--premium-gold)]"
                        : hasOverlap
                          ? "border-amber-500/55 border-dashed bg-[#1a1814] text-amber-100/90"
                          : "border-white/8 bg-[#151515] text-[var(--soft-gray)]"
                    }`}
                  >
                    <span>{time}</span>
                    {hasOverlap ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div
                className={`col-span-2 rounded-2xl border px-4 py-5 text-center ${
                  selectedDate
                    ? "border-amber-500/35 bg-amber-950/20"
                    : isPanelContext
                      ? "border-white/8 bg-[#171717]"
                      : "border-[var(--premium-gold)]/35 bg-[rgba(206,120,50,0.14)]"
                }`}
              >
                {selectedDate ? (
                  <>
                    <p className="text-[13px] font-medium text-amber-100/95">
                      {isSelectedDateHoliday
                        ? "Feriado (cerrado): no hay horarios disponibles para este dia."
                        : "No hay horarios disponibles para este dia."}
                    </p>
                    <p className="mt-1 text-[12px] text-amber-100/75">
                      {isSelectedDateHoliday
                        ? "Elegi otra fecha habilitada para ver turnos disponibles."
                        : "Proba con otra fecha para ver turnos disponibles."}
                    </p>
                  </>
                ) : isPanelContext ? (
                  <p className="text-[13px] text-[var(--soft-gray)]/72">
                    Elegí una fecha para ver los horarios disponibles.
                  </p>
                ) : (
                  <>
                    <p className="text-[13px] font-medium text-[var(--premium-gold)]">
                      Los turnos web se reservan a partir de mañana (no el mismo día).
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--soft-gray)]/88">
                      Elegí una fecha desde mañana para ver horarios.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {isTreatmentModalOpen ? (
        <ColorStudioServicePickerSheet
          selectedIds={draftServiceIds}
          onConfirm={confirmServices}
          onClose={closeTreatmentModal}
        />
      ) : null}
    </>
  );
}
