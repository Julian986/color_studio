"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BookingPicker } from "@/components/booking/booking-picker";
import {
  SALON_TREATMENT_OPTIONS,
  formatSalonDisplayDate,
  isLikelyWhatsappNumber,
} from "@/lib/booking/salon-availability";
import {
  normalizeServiceIds,
  primaryTreatmentIdFromServiceIds,
} from "@/lib/treatments/catalog";

export function PanelNuevoTurnoClient() {
  const router = useRouter();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
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
  const bookingFocusRef = useRef<HTMLDivElement | null>(null);

  const selectedTreatment = useMemo(
    () => SALON_TREATMENT_OPTIONS.find((option) => option.id === selectedTreatmentId),
    [selectedTreatmentId],
  );

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
      return;
    }
    let cancelled = false;
    setRemoteSlots(null);
    const q = new URLSearchParams({
      dateKey: selectedDate,
      treatmentId: primaryTreatmentIdFromServiceIds(selectedServiceIds),
      serviceIds: selectedServiceIds.join(","),
      scope: "panel",
    });
    fetch(`/api/booking/slots?${q.toString()}`, { credentials: "same-origin" })
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
    if (!selectedDate || !selectedTime || !selectedTreatmentId) return;
    if (remoteSlots === undefined || remoteSlots === null) return;
    if (!remoteSlots.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedDate, selectedTime, selectedServiceIds, remoteSlots]);

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
        router.push("/panel-turnos");
        router.refresh();
      }
    } catch {
      setError("Sin conexión o error de red. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] pb-28 text-[var(--soft-gray)]">
      <div className="mx-auto max-w-md px-4 pt-6">
        <header className="mb-5 flex items-center gap-3">
          <Link
            href="/panel-turnos"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-[#171717] text-[var(--soft-gray)]/88 hover:bg-[#1d1d1d]"
            aria-label="Volver al panel"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.85} />
          </Link>
          <div>
            <h1 className="font-heading text-[22px] leading-tight text-[var(--premium-gold)]">Nuevo turno</h1>
            <p className="mt-0.5 text-[12px] text-[var(--soft-gray)]/55">Alta manual · sin pago</p>
          </div>
        </header>

        <BookingPicker
          bookingContext="panel"
          selectedTreatmentId={selectedTreatmentId}
          onTreatmentIdChange={setSelectedTreatmentId}
          selectedServiceIds={selectedServiceIds}
          onServiceIdsChange={(ids) => {
            const normalized = normalizeServiceIds(ids);
            setSelectedServiceIds(normalized);
            setSelectedTreatmentId(primaryTreatmentIdFromServiceIds(normalized));
            setSelectedTime("");
          }}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          remoteTimeSlots={
            selectedDate && selectedServiceIds.length > 0 ? (remoteSlots ?? null) : undefined
          }
          monthAvailabilityServiceIds={selectedServiceIds}
          bookingFocusRef={bookingFocusRef}
          treatmentFirstHintVisible={treatmentFirstHintVisible}
          onTreatmentFirstHintVisible={setTreatmentFirstHintVisible}
        />

        {hasSlot && (
          <section className="mt-6 space-y-4 rounded-2xl border border-white/8 bg-[#171717] px-4 py-4">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-[var(--soft-gray)]/55">Datos del cliente</p>
              <p className="mt-1 text-[12px] text-[var(--soft-gray)]/58">
                Turno el {formatSalonDisplayDate(selectedDate)} a las {selectedTime}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="pn-customerName" className="text-[11px] tracking-[0.12em] text-[var(--soft-gray)]/55">
                  Nombre y apellido
                </label>
                <input
                  id="pn-customerName"
                  name="customerName"
                  autoComplete="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-3 text-[15px] text-[var(--soft-gray)] outline-none placeholder:text-[var(--soft-gray)]/35 focus:border-[var(--premium-gold)]/55"
                />
              </div>
              <div>
                <label htmlFor="pn-customerPhone" className="text-[11px] tracking-[0.12em] text-[var(--soft-gray)]/55">
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
                  className={`mt-1.5 w-full rounded-xl border bg-[#141414] px-3 py-3 text-[15px] text-[var(--soft-gray)] outline-none placeholder:text-[var(--soft-gray)]/35 focus:border-[var(--premium-gold)]/55 ${
                    showWhatsappInvalidHint ? "border-amber-500/45" : "border-white/10"
                  }`}
                />
                {showWhatsappInvalidHint ? (
                  <p className="mt-1 text-[11px] text-amber-200/90">Revisá el número (10–15 dígitos).</p>
                ) : null}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                <input
                  type="checkbox"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 accent-[var(--premium-gold)]"
                />
                <span className="text-[12px] leading-snug text-[var(--soft-gray)]/78">
                  Recordatorios por WhatsApp
                </span>
              </label>
              <div>
                <label htmlFor="pn-notes" className="text-[11px] tracking-[0.12em] text-[var(--soft-gray)]/55">
                  Notas internas (opcional)
                </label>
                <textarea
                  id="pn-notes"
                  name="panelNotes"
                  rows={3}
                  value={panelNotes}
                  onChange={(e) => setPanelNotes(e.target.value)}
                  placeholder="Solo visible en el sistema…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-[#141414] px-3 py-3 text-[14px] text-[var(--soft-gray)] outline-none placeholder:text-[var(--soft-gray)]/35 focus:border-[var(--premium-gold)]/55"
                />
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-red-500/35 bg-red-950/35 px-3 py-2.5 text-center text-[12px] text-red-200/95"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!datosComplete || submitting}
              onClick={() => void handleSubmit()}
              className={`flex h-[50px] w-full items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${
                datosComplete && !submitting
                  ? "cursor-pointer bg-gradient-to-br from-[var(--accent-coral)] to-[var(--accent-orange)] text-white shadow-[0_8px_24px_rgba(182,75,84,0.35)]"
                  : "cursor-not-allowed bg-[#2a2a2a] text-white/40"
              }`}
            >
              {submitting ? "Guardando…" : "Confirmar turno"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
