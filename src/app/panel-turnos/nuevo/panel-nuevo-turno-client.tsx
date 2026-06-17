"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BookingPicker } from "@/components/booking/booking-picker";
import { BookingStepColorStudioServices } from "@/components/booking/booking-step-color-studio-services";
import { BookingWizardShell } from "@/components/booking/booking-wizard-shell";
import { trackPanelClick } from "@/lib/analytics/track";
import {
  SALON_TREATMENT_OPTIONS,
  formatSalonDisplayDate,
  isLikelyWhatsappNumber,
  PANEL_NUEVO_TIME_RANGE_LABEL,
} from "@/lib/booking/salon-availability";
import type { PanelSlotOverlapHit } from "@/lib/booking/slot-overlap";
import {
  MAX_SERVICES_PER_BOOKING,
  normalizeServiceIds,
  primaryTreatmentIdFromServiceIds,
  totalDurationMinutesForServiceIds,
} from "@/lib/treatments/catalog";

export function PanelNuevoTurnoClient() {
  const router = useRouter();
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [treatmentFirstHintVisible, setTreatmentFirstHintVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [panelNotes, setPanelNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<string[] | null | undefined>(undefined);
  const [panelSlotOverlaps, setPanelSlotOverlaps] = useState<Record<string, PanelSlotOverlapHit[]>>({});
  const [serviceLimitHint, setServiceLimitHint] = useState<string | null>(null);
  const bookingFocusRef = useRef<HTMLDivElement | null>(null);

  const selectedServices = useMemo(
    () =>
      selectedServiceIds.flatMap((id) => {
        const found = SALON_TREATMENT_OPTIONS.find((o) => o.id === id);
        return found ? [found] : [];
      }),
    [selectedServiceIds],
  );
  const selectedServicesSummary = useMemo(
    () => selectedServices.map((s) => s.name).join(" + "),
    [selectedServices],
  );
  const selectedTreatment = selectedServices[0];
  const selectedDurationLabel = useMemo(() => {
    const total = totalDurationMinutesForServiceIds(selectedServiceIds);
    if (total <= 0) return "";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `~${h} h ${m} min (provisional)`;
    if (h > 0) return `~${h} h (provisional)`;
    return `~${m} min (provisional)`;
  }, [selectedServiceIds]);

  const hasSlot = Boolean(selectedServiceIds.length > 0 && selectedDate && selectedTime);
  const datosComplete = Boolean(
    customerName.trim().length >= 2 &&
      isLikelyWhatsappNumber(customerPhone) &&
      whatsappOptIn,
  );
  const showWhatsappInvalidHint =
    customerPhone.trim().length >= 8 && !isLikelyWhatsappNumber(customerPhone);

  useEffect(() => {
    if (!selectedDate || selectedServiceIds.length === 0) {
      setRemoteSlots(undefined);
      setPanelSlotOverlaps({});
      return;
    }
    let cancelled = false;
    setRemoteSlots(null);
    const q = new URLSearchParams({
      dateKey: selectedDate,
      treatmentId: primaryTreatmentIdFromServiceIds(selectedServiceIds),
      serviceIds: selectedServiceIds.join(","),
      scope: "panel_nuevo",
    });
    fetch(`/api/booking/slots?${q.toString()}`, { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { slots?: string[]; overlaps?: Record<string, PanelSlotOverlapHit[]> }) => {
        if (!cancelled) {
          setRemoteSlots(Array.isArray(data.slots) ? data.slots : []);
          setPanelSlotOverlaps(data.overlaps && typeof data.overlaps === "object" ? data.overlaps : {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteSlots([]);
          setPanelSlotOverlaps({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedServiceIds]);

  useEffect(() => {
    if (!serviceLimitHint) return;
    const t = window.setTimeout(() => setServiceLimitHint(null), 3200);
    return () => window.clearTimeout(t);
  }, [serviceLimitHint]);

  const toggleServiceId = useCallback((id: string) => {
    setSelectedServiceIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((x) => x !== id);
      } else if (prev.length >= MAX_SERVICES_PER_BOOKING) {
        setServiceLimitHint(`Máximo ${MAX_SERVICES_PER_BOOKING} servicios por turno.`);
        return prev;
      } else {
        next = normalizeServiceIds([...prev, id]);
      }
      setSelectedTreatmentId(primaryTreatmentIdFromServiceIds(next));
      setSelectedDate("");
      setSelectedTime("");
      setRemoteSlots(undefined);
      return next;
    });
  }, []);

  const handleClearSelectedServices = useCallback(() => {
    setSelectedServiceIds([]);
    setSelectedTreatmentId("");
    setSelectedDate("");
    setSelectedTime("");
    setRemoteSlots(undefined);
  }, []);

  const handleWizardBack = useCallback(() => {
    if (wizardStep <= 1) {
      router.push("/panel-turnos");
      return;
    }
    setWizardStep((s) => s - 1);
  }, [router, wizardStep]);

  const handleWizardContinue = useCallback(() => {
    if (wizardStep === 1 && selectedServiceIds.length > 0) {
      trackPanelClick("nuevo_turno_continue", "step_1");
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2 && selectedDate) {
      trackPanelClick("nuevo_turno_continue", "step_2");
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3 && selectedTime) {
      trackPanelClick("nuevo_turno_continue", "step_3");
      setWizardStep(4);
      return;
    }
    if (wizardStep === 4 && datosComplete) {
      trackPanelClick("nuevo_turno_continue", "step_4");
      setWizardStep(5);
    }
  }, [wizardStep, selectedServiceIds.length, selectedDate, selectedTime, datosComplete]);

  async function handleSubmit() {
    if (selectedServiceIds.length === 0 || !selectedDate || !selectedTime || !datosComplete) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/panel/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentId: primaryTreatmentIdFromServiceIds(selectedServiceIds),
          serviceIds: selectedServiceIds,
          dateKey: selectedDate,
          timeLocal: selectedTime,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          whatsappOptIn,
          panelNotes: panelNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el turno.");
        return;
      }
      if (data.ok && data.id) {
        trackPanelClick("agregar_turno", "saved");
        router.push("/panel-turnos");
        router.refresh();
      }
    } catch {
      setError("Sin conexión o error de red. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepMeta = (() => {
    if (wizardStep === 1) return { title: "Nuevo turno", subtitle: "Elegí el servicio" };
    if (wizardStep === 2) return { title: "Elegí la fecha", subtitle: "Cualquier día del mes" };
    if (wizardStep === 3)
      return {
        title: "Elegí el horario",
        subtitle: selectedDate
          ? `${formatSalonDisplayDate(selectedDate)} · ${PANEL_NUEVO_TIME_RANGE_LABEL}`
          : PANEL_NUEVO_TIME_RANGE_LABEL,
      };
    if (wizardStep === 4) return { title: "Datos del cliente", subtitle: "Para confirmar el turno en agenda" };
    return { title: "Confirmar turno", subtitle: "Revisá el resumen antes de guardar" };
  })();

  const summaryBar =
    wizardStep === 1 ? (
      <>
        <span className="min-w-0 flex-1 text-sm font-medium text-gray-700">
          {selectedServiceIds.length} seleccionado{selectedServiceIds.length === 1 ? "" : "s"}
        </span>
        {selectedServiceIds.length > 0 ? (
          <button
            type="button"
            onClick={handleClearSelectedServices}
            aria-label="Limpiar selección"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </>
    ) : wizardStep === 2 ? (
      <>
        <span className="text-sm font-medium text-gray-700">{formatSalonDisplayDate(selectedDate) || "Sin fecha seleccionada"}</span>
        <div className="h-1.5 w-6 rounded-full bg-[#B88E2F]" />
      </>
    ) : wizardStep === 3 ? (
      <>
        <span className="text-sm font-medium text-gray-700">
          {formatSalonDisplayDate(selectedDate)}
          {selectedTime ? ` · ${selectedTime}` : ""}
        </span>
        <div className="h-1.5 w-6 rounded-full bg-[#B88E2F]" />
      </>
    ) : null;

  const wizardContinueDisabled =
    (wizardStep === 1 && selectedServiceIds.length === 0) ||
    (wizardStep === 2 && !selectedDate) ||
    (wizardStep === 3 && !selectedTime) ||
    (wizardStep === 4 && !datosComplete) ||
    (wizardStep === 5 && (!datosComplete || submitting || !hasSlot));

  const wizardContinueLabel = wizardStep === 5 ? (submitting ? "Guardando…" : "Confirmar turno") : "Continuar";

  const onWizardContinue = () => {
    if (wizardStep === 5) {
      void handleSubmit();
      return;
    }
    handleWizardContinue();
  };

  return (
    <BookingWizardShell
      onBack={handleWizardBack}
      closeHref="/panel-turnos"
      title={stepMeta.title}
      subtitle={stepMeta.subtitle}
      summary={summaryBar}
      continueLabel={wizardContinueLabel}
      onContinue={onWizardContinue}
      continueDisabled={wizardContinueDisabled}
      continueLoading={submitting && wizardStep === 5}
    >
      {wizardStep === 1 ? (
        <BookingStepColorStudioServices
          selectedServiceIds={selectedServiceIds}
          onToggleTreatmentId={toggleServiceId}
          comboAlertText={serviceLimitHint}
        />
      ) : null}

      {wizardStep === 2 ? (
        <BookingPicker
          wizardSection="date"
          bookingContext="panel_nuevo"
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          treatmentFirstHintVisible={false}
          onTreatmentFirstHintVisible={setTreatmentFirstHintVisible}
          monthAvailabilityServiceIds={selectedServiceIds}
        />
      ) : null}

      {wizardStep === 3 ? (
        <BookingPicker
          wizardSection="time"
          bookingContext="panel_nuevo"
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          remoteTimeSlots={selectedDate && selectedServiceIds.length > 0 ? (remoteSlots ?? null) : undefined}
          panelSlotOverlaps={panelSlotOverlaps}
          bookingFocusRef={bookingFocusRef}
          treatmentFirstHintVisible={false}
          onTreatmentFirstHintVisible={setTreatmentFirstHintVisible}
        />
      ) : null}

      {wizardStep === 4 ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="pn-customerName" className="text-[16px] font-semibold text-gray-900">
              Nombre y apellido
            </label>
            <input
              id="pn-customerName"
              name="customerName"
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Como figura en el turno"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/25"
            />
          </div>
          <div>
            <label htmlFor="pn-customerPhone" className="text-[16px] font-semibold text-gray-900">
              WhatsApp
            </label>
            <input
              id="pn-customerPhone"
              name="customerPhone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Ej: +54 9 11 2345-6789"
              aria-invalid={showWhatsappInvalidHint}
              className={`mt-2 w-full rounded-xl border bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/25 ${
                showWhatsappInvalidHint ? "border-amber-400" : "border-gray-200"
              }`}
            />
            {showWhatsappInvalidHint ? (
              <p className="mt-2 text-[15px] text-amber-700">Revisá el número: entre 10 y 15 dígitos.</p>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-[#F5F5F5] px-4 py-4">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="mt-1 h-5 w-5 accent-[#B88E2F]"
            />
            <span className="text-[16px] leading-snug text-gray-800">
              Enviar recordatorios y avisos del turno por WhatsApp.
            </span>
          </label>
          <div>
            <label htmlFor="pn-notes" className="text-[16px] font-semibold text-gray-900">
              Notas internas (opcional)
            </label>
            <textarea
              id="pn-notes"
              name="panelNotes"
              rows={3}
              value={panelNotes}
              onChange={(e) => setPanelNotes(e.target.value)}
              placeholder="Solo visible en el sistema…"
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/25"
            />
          </div>
        </div>
      ) : null}

      {wizardStep === 5 ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-gray-100 bg-[#F5F5F5] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <p className="text-sm font-semibold tracking-wide text-[#B88E2F] uppercase">Resumen del turno</p>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Servicio</dt>
                <dd className="text-lg font-semibold text-gray-900">{selectedServicesSummary}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fecha</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatSalonDisplayDate(selectedDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Horario</dt>
                <dd className="text-lg font-semibold text-gray-900">{selectedTime}</dd>
              </div>
              {selectedDurationLabel ? (
                <div>
                  <dt className="text-sm text-gray-500">Duración</dt>
                  <dd className="text-lg font-semibold text-gray-900">{selectedDurationLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-gray-500">Contacto</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {customerName.trim()} · {customerPhone.trim()}
                </dd>
              </div>
              {panelNotes.trim() ? (
                <div>
                  <dt className="text-sm text-gray-500">Notas internas</dt>
                  <dd className="text-base text-gray-800">{panelNotes.trim()}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {error ? (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[16px] text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </BookingWizardShell>
  );
}
