"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BookingPicker } from "@/components/booking/booking-picker";
import { BookingStepColorStudioServices } from "@/components/booking/booking-step-color-studio-services";
import { BookingWizardShell } from "@/components/booking/booking-wizard-shell";
import { trackWizardContinue } from "@/lib/analytics/track";
import {
  SALON_TREATMENT_OPTIONS,
  formatSalonDisplayDate,
  isLikelyWhatsappNumber,
} from "@/lib/booking/salon-availability";
import { event as gaEvent } from "@/lib/gtag";
import { treatmentRequiresPublicDeposit } from "@/lib/reservations/public-deposit";
import {
  MAX_SERVICES_PER_BOOKING,
  findSalonTreatmentById,
  normalizeServiceIds,
  primaryTreatmentIdFromServiceIds,
  totalDurationMinutesForServiceIds,
} from "@/lib/treatments/catalog";

type TurnosClientProps = {
  initialTreatment?: string;
};

type MeReservationsResponse = {
  reservations?: Array<{
    customerName?: string;
    customerPhone?: string;
    startsAtIso?: string;
  }>;
};
const CUSTOMER_PROFILE_CACHE_KEY = "mp_customer_profile_cache";

export default function TurnosClient({ initialTreatment = "" }: TurnosClientProps) {
  const router = useRouter();
  const treatmentParam = (() => {
    try {
      return decodeURIComponent(initialTreatment.trim());
    } catch {
      return initialTreatment.trim();
    }
  })();
  const initialMatch = SALON_TREATMENT_OPTIONS.find(
    (option) => option.id === treatmentParam || option.name === treatmentParam,
  );

  const [wizardStep, setWizardStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialMatch ? normalizeServiceIds([initialMatch.id]) : [],
  );
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(
    initialMatch ? primaryTreatmentIdFromServiceIds([initialMatch.id]) : "",
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [serviceLimitHint, setServiceLimitHint] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"unknown" | "guest" | "authed">("unknown");
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<string[] | null | undefined>(undefined);
  const sessionBootstrappedRef = useRef(false);

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
  const totalSelectedDurationMinutes = useMemo(
    () => totalDurationMinutesForServiceIds(selectedServiceIds),
    [selectedServiceIds],
  );
  const totalSelectedDurationLabel = useMemo(() => {
    const total = totalSelectedDurationMinutes;
    if (total <= 0) return "";
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h} h ${m} min (provisional)`;
    if (h > 0) return `${h} h (provisional)`;
    return `${m} min (provisional)`;
  }, [totalSelectedDurationMinutes]);
  const primaryService = selectedServices[0];

  const requiresDeposit = selectedServiceIds.some((id) => treatmentRequiresPublicDeposit(id));
  const datosComplete = Boolean(
    customerName.trim().length >= 2 &&
      isLikelyWhatsappNumber(customerPhone) &&
      whatsappOptIn,
  );
  const showWhatsappInvalidHint =
    customerPhone.trim().length >= 8 && !isLikelyWhatsappNumber(customerPhone);
  const hasSessionProfile =
    sessionStatus === "authed" && customerName.trim().length >= 2 && isLikelyWhatsappNumber(customerPhone);

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
      setSelectedTime("");
      return next;
    });
  }, []);

  const clearSelectedServices = useCallback(() => {
    setSelectedServiceIds([]);
    setSelectedTreatmentId("");
    setSelectedDate("");
    setSelectedTime("");
    setServiceLimitHint(null);
  }, []);

  const handleClearSelectedServices = useCallback(() => {
    if (selectedServiceIds.length >= 2 && !window.confirm("¿Quitar todos los servicios seleccionados?")) {
      return;
    }
    clearSelectedServices();
  }, [clearSelectedServices, selectedServiceIds.length]);

  const handleWizardBack = useCallback(() => {
    if (wizardStep <= 1) {
      router.push("/");
      return;
    }
    if (wizardStep === 5 && hasSessionProfile) {
      setWizardStep(3);
      return;
    }
    setWizardStep((s) => s - 1);
  }, [router, wizardStep, hasSessionProfile]);

  const handleWizardContinue = useCallback(() => {
    if (wizardStep === 1 && selectedServiceIds.length > 0) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2 && selectedDate) {
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3 && selectedTime) {
      setWizardStep(hasSessionProfile ? 5 : 4);
      return;
    }
    if (wizardStep === 4 && datosComplete) {
      setWizardStep(5);
    }
  }, [wizardStep, selectedServiceIds.length, selectedDate, selectedTime, hasSessionProfile, datosComplete]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_PROFILE_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as { name?: string; phone?: string };
      const cachedName = String(cached.name ?? "").trim();
      const cachedPhone = String(cached.phone ?? "").trim();
      if (cachedName) {
        setSessionDisplayName(cachedName);
        if (customerName.trim().length < 2) setCustomerName(cachedName);
        setSessionStatus("authed");
      }
      if (cachedPhone && !isLikelyWhatsappNumber(customerPhone)) {
        setCustomerPhone(cachedPhone);
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    if (sessionBootstrappedRef.current) return;
    sessionBootstrappedRef.current = true;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/me/reservations?source=turnos", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 401) {
          setSessionStatus("guest");
          return;
        }
        if (!res.ok) {
          setSessionStatus("guest");
          return;
        }
        const data = (await res.json()) as MeReservationsResponse;
        const list = Array.isArray(data.reservations) ? data.reservations : [];
        const latest = [...list].sort((a, b) =>
          String(b.startsAtIso ?? "").localeCompare(String(a.startsAtIso ?? "")),
        )[0];
        if (latest?.customerName && customerName.trim().length < 2) {
          setCustomerName(latest.customerName.trim());
        }
        if (latest?.customerPhone && !isLikelyWhatsappNumber(customerPhone)) {
          setCustomerPhone(latest.customerPhone.trim());
        }
        const n = latest?.customerName?.trim();
        setSessionDisplayName(n && n.length >= 2 ? n : null);
        setSessionStatus("authed");
        try {
          localStorage.setItem(
            CUSTOMER_PROFILE_CACHE_KEY,
            JSON.stringify({
              name: latest?.customerName?.trim() ?? "",
              phone: latest?.customerPhone?.trim() ?? "",
            }),
          );
        } catch {
          // ignore
        }
      } catch {
        if (!cancelled) setSessionStatus("guest");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDate || selectedServiceIds.length === 0) {
      setRemoteSlots(undefined);
      return;
    }
    let cancelled = false;
    setRemoteSlots(null);
    const q = new URLSearchParams({
      dateKey: selectedDate,
      treatmentId: primaryTreatmentIdFromServiceIds(selectedServiceIds),
      serviceIds: selectedServiceIds.join(","),
      scope: "public",
    });
    fetch(`/api/booking/slots?${q.toString()}`)
      .then((res) => res.json())
      .then((data: { slots?: string[] }) => {
        if (!cancelled) setRemoteSlots(Array.isArray(data.slots) ? data.slots : []);
      })
      .catch(() => {
        if (!cancelled) setRemoteSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedServiceIds]);

  useEffect(() => {
    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0) return;
    if (remoteSlots === undefined || remoteSlots === null) return;
    if (!remoteSlots.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedDate, selectedTime, selectedServiceIds, remoteSlots]);

  useEffect(() => {
    if (!serviceLimitHint) return;
    const t = window.setTimeout(() => setServiceLimitHint(null), 3200);
    return () => window.clearTimeout(t);
  }, [serviceLimitHint]);

  const handleConfirm = async () => {
    const primary = findSalonTreatmentById(primaryTreatmentIdFromServiceIds(selectedServiceIds));
    if (selectedServices.length === 0 || !primary || !selectedDate || !selectedTime || !datosComplete) {
      return;
    }
    const subtitleMerged =
      selectedServices.length > 1
        ? selectedServices.map((s) => s.subtitle).join(" · ")
        : primary.subtitle;
    setConfirmError(null);
    setCheckoutLoading(true);
    try {
      const resPending = await fetch("/api/reservations/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentId: primary.id,
          treatmentName: selectedServicesSummary,
          subtitle: subtitleMerged,
          category: primary.category,
          serviceIds: selectedServiceIds,
          dateKey: selectedDate,
          timeLocal: selectedTime,
          displayDate: formatSalonDisplayDate(selectedDate),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          whatsappOptIn,
        }),
      });
      const dataPending = (await resPending.json()) as {
        error?: string;
        id?: string;
        checkoutToken?: string;
        bookingMode?: "pending_payment" | "confirmed";
      };
      if (!resPending.ok) {
        setConfirmError(dataPending.error ?? "No se pudo reservar el turno.");
        return;
      }
      if (!dataPending.id) {
        setConfirmError("Respuesta inválida del servidor.");
        return;
      }

      if (dataPending.bookingMode === "confirmed" || !requiresDeposit) {
        gaEvent("reservation_confirmed_no_deposit", {
          treatment_id: primary.id,
          treatment_name: selectedServicesSummary,
          date_key: selectedDate,
          time_local: selectedTime,
        });
        const qs = new URLSearchParams({
          treatment: selectedServicesSummary,
          subtitle: subtitleMerged,
          date: formatSalonDisplayDate(selectedDate),
          time: selectedTime,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          id: dataPending.id,
        });
        window.location.href = `/turnos/confirmado?${qs.toString()}`;
        return;
      }

      if (!dataPending.checkoutToken) {
        setConfirmError("Respuesta inválida del servidor.");
        return;
      }

      const resPref = await fetch("/api/mercadopago/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: dataPending.id,
          checkoutToken: dataPending.checkoutToken,
        }),
      });
      const dataPref = (await resPref.json()) as { error?: string; initPoint?: string };
      if (!resPref.ok) {
        setConfirmError(dataPref.error ?? "No se pudo iniciar Mercado Pago.");
        return;
      }
      if (!dataPref.initPoint) {
        setConfirmError("Mercado Pago no devolvió el enlace de pago.");
        return;
      }

      sessionStorage.setItem(
        "mp_turno_snapshot",
        JSON.stringify({
          treatment: selectedServicesSummary,
          subtitle: subtitleMerged,
          date: formatSalonDisplayDate(selectedDate),
          time: selectedTime,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          id: dataPending.id,
        }),
      );
      gaEvent("reservation_checkout_start", {
        treatment_id: primary.id,
        treatment_name: selectedServicesSummary,
        date_key: selectedDate,
        time_local: selectedTime,
      });
      window.location.href = dataPref.initPoint;
    } catch {
      setConfirmError("Sin conexión o error de red. Probá de nuevo.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const wizardContinueDisabled =
    (wizardStep === 1 && selectedServiceIds.length === 0) ||
    (wizardStep === 2 && !selectedDate) ||
    (wizardStep === 3 && !selectedTime) ||
    (wizardStep === 4 && !datosComplete) ||
    (wizardStep === 5 && (!datosComplete || checkoutLoading));

  const wizardContinueLabel = (() => {
    if (wizardStep === 1) return `Continuar (${selectedServiceIds.length})`;
    if (wizardStep === 5) {
      if (checkoutLoading) return "Confirmando…";
      return requiresDeposit ? "Pagar seña con Mercado Pago" : "Confirmar turno";
    }
    return "Continuar";
  })();

  const onWizardContinue = () => {
    if (wizardStep === 5) {
      void handleConfirm();
      return;
    }
    trackWizardContinue(wizardStep);
    handleWizardContinue();
  };

  const stepMeta = (() => {
    if (wizardStep === 1) {
      return { title: "Reservar turno", subtitle: "Elegí tus servicios" };
    }
    if (wizardStep === 2) {
      return { title: "Elegí tu fecha", subtitle: "Seleccioná un día disponible" };
    }
    if (wizardStep === 3) {
      return {
        title: "Elegí tu horario",
        subtitle: formatSalonDisplayDate(selectedDate) || "Horario disponible",
      };
    }
    if (wizardStep === 4) {
      return { title: "Tus datos", subtitle: "Para confirmar y enviarte recordatorios" };
    }
    return { title: "Confirmá tu turno", subtitle: "Revisá el resumen antes de continuar" };
  })();

  const summaryBar =
    wizardStep === 1 ? (
      <>
        <span className="min-w-0 flex-1 text-sm font-medium text-gray-700">
          {selectedServiceIds.length} seleccionado{selectedServiceIds.length === 1 ? "" : "s"}
          {totalSelectedDurationMinutes > 0 ? ` · ${totalSelectedDurationLabel}` : ""}
        </span>
        {selectedServiceIds.length > 0 ? (
          <button
            type="button"
            onClick={handleClearSelectedServices}
            aria-label="Limpiar selección"
            title="Limpiar selección"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </>
    ) : wizardStep === 2 ? (
      <>
        <span className="text-sm font-medium text-gray-700">
          {selectedServiceIds.length} servicio{selectedServiceIds.length === 1 ? "" : "s"}
          {selectedDate ? ` · ${formatSalonDisplayDate(selectedDate)}` : ""}
        </span>
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

  return (
    <BookingWizardShell
      onBack={handleWizardBack}
      title={stepMeta.title}
      subtitle={stepMeta.subtitle}
      summary={summaryBar}
      continueLabel={wizardContinueLabel}
      onContinue={onWizardContinue}
      continueDisabled={wizardContinueDisabled}
      continueLoading={checkoutLoading && wizardStep === 5}
    >
      {sessionStatus === "authed" && sessionDisplayName && wizardStep === 1 ? (
        <p className="mb-6 text-center text-[16px] text-gray-600">
          Hola, <span className="font-semibold text-gray-900">{sessionDisplayName}</span>
        </p>
      ) : null}

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
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          treatmentFirstHintVisible={false}
          onTreatmentFirstHintVisible={() => {}}
          monthAvailabilityServiceIds={selectedServiceIds}
        />
      ) : null}

      {wizardStep === 3 ? (
        <BookingPicker
          wizardSection="time"
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          remoteTimeSlots={remoteSlots ?? null}
          treatmentFirstHintVisible={false}
          onTreatmentFirstHintVisible={() => {}}
          monthAvailabilityServiceIds={selectedServiceIds}
        />
      ) : null}

      {wizardStep === 4 && !hasSessionProfile ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="customerName" className="text-[16px] font-semibold text-gray-900">
              Nombre y apellido
            </label>
            <input
              id="customerName"
              name="customerName"
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Como figura en tu DNI o preferís que te llamemos"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[16px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/25"
            />
          </div>
          <div>
            <label htmlFor="customerPhone" className="text-[16px] font-semibold text-gray-900">
              WhatsApp
            </label>
            <input
              id="customerPhone"
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
              <p className="mt-2 text-[16px] text-amber-700">
                Revisá el número: entre 10 y 15 dígitos (podés usar +54, espacios o guiones).
              </p>
            ) : (
              <p className="mt-2 text-[16px] text-gray-500">Mismo número que usás en WhatsApp.</p>
            )}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-[#F5F5F5] px-4 py-4">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              className="mt-1 h-5 w-5 accent-[#B88E2F]"
            />
            <span className="text-[16px] leading-snug text-gray-800">
              Acepto recibir recordatorios y avisos de mi turno por WhatsApp.
            </span>
          </label>
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
              {totalSelectedDurationLabel ? (
                <div>
                  <dt className="text-sm text-gray-500">Duración estimada</dt>
                  <dd className="text-lg font-semibold text-gray-900">{totalSelectedDurationLabel}</dd>
                </div>
              ) : null}
              {hasSessionProfile ? (
                <div>
                  <dt className="text-sm text-gray-500">Contacto</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {customerName.trim()} · {customerPhone.trim()}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <p className="text-[16px] leading-relaxed text-gray-600">
            Al confirmar, el turno queda agendado y te enviamos recordatorio por WhatsApp. Precio y duración finales se
            confirman en salón.
          </p>
          {confirmError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[16px] text-red-800"
            >
              {confirmError}
            </p>
          ) : null}
        </div>
      ) : null}
    </BookingWizardShell>
  );
}
