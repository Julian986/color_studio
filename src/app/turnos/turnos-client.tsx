"use client";

import { CalendarDays, ChevronLeft, Home as HomeIcon, Percent, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BookingPicker } from "@/components/booking/booking-picker";
import { event as gaEvent } from "@/lib/gtag";
import {
  SALON_TREATMENT_OPTIONS,
  formatSalonDisplayDate,
  isLikelyWhatsappNumber,
} from "@/lib/booking/salon-availability";
import { PROVISIONAL_SCHEDULE_NOTE } from "@/lib/brand";
import { treatmentRequiresPublicDeposit } from "@/lib/reservations/public-deposit";
import {
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

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initialMatch ? normalizeServiceIds([initialMatch.id]) : [],
  );
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(
    initialMatch ? primaryTreatmentIdFromServiceIds([initialMatch.id]) : "",
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [treatmentFirstHintVisible, setTreatmentFirstHintVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"unknown" | "guest" | "authed">("unknown");
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<string[] | null | undefined>(undefined);
  const bookingFocusRef = useRef<HTMLDivElement | null>(null);
  const dataSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const scrollPaymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDatosCompleteRef = useRef(false);
  const sessionBootstrappedRef = useRef(false);

  const selectedServices = useMemo(
    () =>
      selectedServiceIds.flatMap((id) => {
        const opt = SALON_TREATMENT_OPTIONS.find((o) => o.id === id);
        return opt ? [opt] : [];
      }),
    [selectedServiceIds],
  );
  const selectedServicesSummary = useMemo(
    () => selectedServices.map((s) => s.name).join(" + "),
    [selectedServices],
  );
  const selectedDurationLabel = useMemo(() => {
    const total = totalDurationMinutesForServiceIds(selectedServiceIds);
    if (total <= 0) return "";
    const h = Math.floor(total / 60);
    const rem = total % 60;
    if (h > 0 && rem > 0) return `Duración ${h} h ${rem} min (provisional)`;
    if (h > 0) return `Duración ${h} h (provisional)`;
    return `Duración ${rem} min (provisional)`;
  }, [selectedServiceIds]);

  const requiresDeposit = selectedServiceIds.some((id) => treatmentRequiresPublicDeposit(id));

  const hasSlot = Boolean(selectedServiceIds.length > 0 && selectedDate && selectedTime);
  const datosComplete = Boolean(
    customerName.trim().length >= 2 &&
      isLikelyWhatsappNumber(customerPhone) &&
      whatsappOptIn,
  );

  const activeStep = selectedServiceIds.length === 0 ? 1 : !selectedDate ? 2 : !selectedTime ? 3 : !datosComplete ? 4 : 5;

  const hasSessionProfile = sessionStatus === "authed" && Boolean(sessionDisplayName);

  useEffect(() => {
    if (sessionBootstrappedRef.current) return;
    sessionBootstrappedRef.current = true;
    fetch("/api/me/reservations", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeReservationsResponse | null) => {
        if (!data?.reservations?.length) {
          setSessionStatus("guest");
          return;
        }
        const latest = data.reservations[0];
        const name = latest.customerName?.trim();
        const phone = latest.customerPhone?.trim();
        if (name) setSessionDisplayName(name);
        if (name && phone) {
          setCustomerName(name);
          setCustomerPhone(phone);
          try {
            sessionStorage.setItem(
              CUSTOMER_PROFILE_CACHE_KEY,
              JSON.stringify({ name, phone }),
            );
          } catch {
            /* ignore */
          }
        }
        setSessionStatus("authed");
      })
      .catch(() => setSessionStatus("guest"));
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CUSTOMER_PROFILE_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; phone?: string };
      if (!customerName && parsed.name) setCustomerName(parsed.name);
      if (!customerPhone && parsed.phone) setCustomerPhone(parsed.phone);
    } catch {
      /* ignore */
    }
  }, [customerName, customerPhone]);

  const applyServiceIds = (ids: string[]) => {
    const normalized = normalizeServiceIds(ids);
    setSelectedServiceIds(normalized);
    setSelectedTreatmentId(primaryTreatmentIdFromServiceIds(normalized));
    setSelectedTime("");
  };

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
        if (!cancelled) {
          setRemoteSlots(Array.isArray(data.slots) ? data.slots : []);
        }
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

  const scheduleScrollToPaymentSection = useCallback(() => {
    if (!hasSlot) return;
    if (scrollPaymentTimeoutRef.current) clearTimeout(scrollPaymentTimeoutRef.current);
    scrollPaymentTimeoutRef.current = setTimeout(() => {
      scrollPaymentTimeoutRef.current = null;
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
  }, [hasSlot]);

  useEffect(() => {
    return () => {
      if (scrollPaymentTimeoutRef.current) clearTimeout(scrollPaymentTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasSlot) {
      prevDatosCompleteRef.current = datosComplete;
      return;
    }
    const becameComplete = datosComplete && !prevDatosCompleteRef.current;
    prevDatosCompleteRef.current = datosComplete;
    if (becameComplete) scheduleScrollToPaymentSection();
  }, [datosComplete, hasSlot, scheduleScrollToPaymentSection]);

  useEffect(() => {
    if (!hasSlot) return;
    const id = requestAnimationFrame(() => {
      dataSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [hasSlot, selectedTime]);

  const handleMercadoPagoCheckout = async () => {
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
      const pendingBody = {
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
      };
      const resPending = await fetch("/api/reservations/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingBody),
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

      if (dataPending.bookingMode === "confirmed") {
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

      const snapshot = {
        treatment: selectedServicesSummary,
        subtitle: subtitleMerged,
        date: formatSalonDisplayDate(selectedDate),
        time: selectedTime,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        id: dataPending.id,
      };
      sessionStorage.setItem("mp_turno_snapshot", JSON.stringify(snapshot));
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

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
        <header className="mb-5 flex items-center justify-between">
          <Link href="/" aria-label="Volver a inicio" className="cursor-pointer text-[var(--soft-gray)]/88">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <h1 className="text-[30px] leading-none font-heading">Reservar turno</h1>
          <span className="h-5 w-5" />
        </header>
        {sessionStatus === "authed" && sessionDisplayName ? (
          <p className="mb-4 text-center text-[14px] text-[var(--soft-gray)]/85">
            Hola, <span className="font-semibold text-[var(--premium-gold)]">{sessionDisplayName}</span>
          </p>
        ) : null}

        <p className="mb-4 text-center text-[11px] leading-relaxed text-[var(--soft-gray)]/65">
          {PROVISIONAL_SCHEDULE_NOTE}
        </p>

        <BookingPicker
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedServiceIds={selectedServiceIds}
          onServiceIdsChange={applyServiceIds}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          remoteTimeSlots={
            selectedDate && selectedServiceIds.length > 0 ? (remoteSlots ?? null) : undefined
          }
          selectedDurationLabel={selectedServiceIds.length > 0 ? selectedDurationLabel : undefined}
          summaryTitle={selectedServices.length > 0 ? selectedServicesSummary : undefined}
          monthAvailabilityServiceIds={selectedServiceIds}
          bookingFocusRef={bookingFocusRef}
          treatmentFirstHintVisible={treatmentFirstHintVisible}
          onTreatmentFirstHintVisible={setTreatmentFirstHintVisible}
        />

        {hasSlot && (
          <div ref={dataSectionRef} className="mt-6 space-y-5">
            {!hasSessionProfile ? (
              <section
                className={`rounded-2xl border bg-[#171717] px-4 py-4 transition-all ${
                  activeStep === 4
                    ? "border-[var(--premium-gold)] shadow-[0_0_0_1px_rgba(228,202,105,0.22),0_0_22px_rgba(206,120,50,0.18)]"
                    : "border-white/8"
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Paso 4</p>
                    <p className="mt-1 text-[18px] font-heading text-[var(--soft-gray)]">Tus datos</p>
                    <p className="mt-1 text-[12px] text-[var(--soft-gray)]/58">
                      Completá tu nombre y WhatsApp para recordatorios.
                    </p>
                    {activeStep === 4 && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--premium-gold)]/92">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--premium-gold)]" />
                        <span>Necesitamos estos datos para confirmar</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="customerName" className="text-[11px] tracking-[0.12em] text-[var(--soft-gray)]/55">
                      Nombre y apellido
                    </label>
                    <input
                      id="customerName"
                      name="customerName"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-3 text-[15px] text-[var(--soft-gray)] outline-none placeholder:text-[var(--soft-gray)]/35 focus:border-[var(--premium-gold)]/55"
                    />
                  </div>
                  <div>
                    <label htmlFor="customerPhone" className="text-[11px] tracking-[0.12em] text-[var(--soft-gray)]/55">
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
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-3 text-[15px] text-[var(--soft-gray)] outline-none placeholder:text-[var(--soft-gray)]/35 focus:border-[var(--premium-gold)]/55"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={whatsappOptIn}
                      onChange={(e) => setWhatsappOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 accent-[var(--premium-gold)]"
                    />
                    <span className="text-[12px] leading-relaxed text-[var(--soft-gray)]/72">
                      Acepto recibir recordatorios por WhatsApp sobre este turno.
                    </span>
                  </label>
                </div>
              </section>
            ) : null}

            <section
              ref={paymentSectionRef}
              className={`rounded-2xl border bg-[#171717] px-4 py-4 transition-all ${
                activeStep >= 5
                  ? "border-[var(--premium-gold)] shadow-[0_0_0_1px_rgba(228,202,105,0.22),0_0_22px_rgba(206,120,50,0.18)]"
                  : "border-white/8"
              }`}
            >
              <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Paso 5</p>
              <p className="mt-1 text-[18px] font-heading text-[var(--soft-gray)]">Confirmar</p>
              <p className="mt-2 text-[13px] text-[var(--soft-gray)]/72">
                {selectedServicesSummary} · {formatSalonDisplayDate(selectedDate)} · {selectedTime}
              </p>
              {requiresDeposit ? (
                <p className="mt-2 text-[12px] text-[var(--premium-gold)]/88">
                  Seña fija con Mercado Pago para confirmar el turno.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-[var(--soft-gray)]/58">
                  Sin seña online: el turno queda confirmado al enviar.
                </p>
              )}
              {confirmError ? (
                <p className="mt-3 rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-[13px] text-red-200/95">
                  {confirmError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={!datosComplete || checkoutLoading}
                onClick={handleMercadoPagoCheckout}
                className="mt-4 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[var(--premium-gold)] text-[15px] font-semibold tracking-[0.1em] text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {checkoutLoading
                  ? "Procesando…"
                  : requiresDeposit
                    ? "Pagar seña y confirmar"
                    : "Confirmar turno"}
              </button>
            </section>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30">
        <div className="flex w-full items-center justify-between border-t border-white/8 bg-black/60 px-4 py-2.5 backdrop-blur-[16px]">
          <Link href="/" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <HomeIcon className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Inicio</span>
          </Link>
          <Link href="/tratamientos" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <Sparkles className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Servicios</span>
          </Link>
          <button className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <CalendarDays className="h-5 w-5 text-[var(--premium-gold)]" strokeWidth={1.9} />
            <span className="text-[9px] tracking-[0.12em] text-[var(--premium-gold)]">Turnos</span>
          </button>
          <Link href="/promociones" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <Percent className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Promos</span>
          </Link>
          <Link href="/perfil" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <User className="h-5 w-5" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
