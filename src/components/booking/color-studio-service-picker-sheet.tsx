"use client";

import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";

import { SALON_TREATMENT_OPTIONS } from "@/lib/booking/salon-availability";
import { PROVISIONAL_SCHEDULE_NOTE } from "@/lib/brand";
import {
  MAX_SERVICES_PER_BOOKING,
  findSalonTreatmentById,
  normalizeServiceIds,
  totalDurationMinutesForServiceIds,
} from "@/lib/treatments/catalog";

type ColorStudioServicePickerSheetProps = {
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
};

function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return "";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `~${h} h ${m} min en total (provisional)`;
  if (h > 0) return `~${h} h en total (provisional)`;
  return `~${m} min en total (provisional)`;
}

export function ColorStudioServicePickerSheet({
  selectedIds,
  onConfirm,
  onClose,
}: ColorStudioServicePickerSheetProps) {
  const [draftIds, setDraftIds] = useState(() => normalizeServiceIds(selectedIds));

  const toggle = (id: string) => {
    setDraftIds((current) => {
      const normalized = normalizeServiceIds(current);
      if (normalized.includes(id)) {
        return normalized.filter((x) => x !== id);
      }
      if (normalized.length >= MAX_SERVICES_PER_BOOKING) return normalized;
      return normalizeServiceIds([...normalized, id]);
    });
  };

  const totalMinutes = totalDurationMinutesForServiceIds(draftIds);
  const atMax = draftIds.length >= MAX_SERVICES_PER_BOOKING;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#111111] text-white">
      <header className="flex items-center justify-between border-b border-white/8 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-[var(--soft-gray)]/88"
          aria-label="Cerrar"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h2 className="text-[18px] font-heading">Elegí servicios</h2>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-[var(--soft-gray)]/88"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </header>

      <p className="px-4 py-3 text-center text-[11px] leading-relaxed text-[var(--soft-gray)]/72">
        {PROVISIONAL_SCHEDULE_NOTE}
      </p>
      <p className="px-4 pb-2 text-center text-[12px] text-[var(--soft-gray)]/78">
        Podés elegir hasta {MAX_SERVICES_PER_BOOKING} servicios en la misma visita (ej. corte + color).
      </p>

      <ul className="flex-1 space-y-2 overflow-y-auto px-4">
        {SALON_TREATMENT_OPTIONS.map((opt) => {
          const detail = findSalonTreatmentById(opt.id);
          const isSelected = draftIds.includes(opt.id);
          const disabled = !isSelected && atMax;
          return (
            <li key={opt.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt.id)}
                className={`w-full cursor-pointer rounded-2xl border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSelected
                    ? "border-[var(--premium-gold)] bg-[rgba(206,120,50,0.12)]"
                    : "border-white/8 bg-[#171717]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium text-[var(--soft-gray)]">{opt.name}</p>
                    <p className="mt-1 text-[12px] text-[var(--soft-gray)]/62">{opt.subtitle}</p>
                    {detail?.priceLabel ? (
                      <p className="mt-1 text-[11px] text-[var(--premium-gold)]/88">{detail.priceLabel}</p>
                    ) : null}
                  </div>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      isSelected
                        ? "border-[var(--premium-gold)] bg-[var(--premium-gold)] text-[var(--on-accent)]"
                        : "border-white/25 text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/8 px-4 py-4 pb-8">
        {draftIds.length > 0 && totalMinutes > 0 ? (
          <p className="mb-3 text-center text-[12px] text-[var(--premium-gold)]/90">
            {formatDurationLabel(totalMinutes)}
          </p>
        ) : null}
        <button
          type="button"
          disabled={draftIds.length === 0}
          onClick={() => onConfirm(normalizeServiceIds(draftIds))}
          className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[var(--premium-gold)] text-[15px] font-semibold tracking-[0.08em] text-[var(--on-accent)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {draftIds.length === 0
            ? "Elegí al menos un servicio"
            : draftIds.length === 1
              ? "Continuar con 1 servicio"
              : `Continuar con ${draftIds.length} servicios`}
        </button>
      </div>
    </div>
  );
}
