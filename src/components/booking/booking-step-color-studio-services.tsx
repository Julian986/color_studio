"use client";

import { SALON_TREATMENT_OPTIONS } from "@/lib/booking/salon-availability";
import { PROVISIONAL_SCHEDULE_NOTE } from "@/lib/brand";
import {
  MAX_SERVICES_PER_BOOKING,
  findSalonTreatmentById,
  totalDurationMinutesForServiceIds,
} from "@/lib/treatments/catalog";

type BookingStepColorStudioServicesProps = {
  selectedServiceIds: string[];
  onToggleTreatmentId: (id: string) => void;
  comboAlertText?: string | null;
};

function formatDurationLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return "";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `~${h} h ${m} min en total (provisional)`;
  if (h > 0) return `~${h} h en total (provisional)`;
  return `~${m} min en total (provisional)`;
}

export function BookingStepColorStudioServices({
  selectedServiceIds,
  onToggleTreatmentId,
  comboAlertText,
}: BookingStepColorStudioServicesProps) {
  const totalMinutes = totalDurationMinutesForServiceIds(selectedServiceIds);
  const atMax = selectedServiceIds.length >= MAX_SERVICES_PER_BOOKING;

  return (
    <div className="space-y-4">
      <p className="text-center text-[14px] leading-relaxed text-gray-600">{PROVISIONAL_SCHEDULE_NOTE}</p>
      <p className="text-center text-[15px] text-gray-700">
        Podés elegir hasta {MAX_SERVICES_PER_BOOKING} servicios en la misma visita (ej. corte + color).
      </p>

      {comboAlertText ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-[16px] text-gray-900">
          {comboAlertText}
        </div>
      ) : null}

      {selectedServiceIds.length > 0 && totalMinutes > 0 ? (
        <p className="text-center text-[15px] font-medium text-[#B88E2F]">
          {formatDurationLabel(totalMinutes)}
        </p>
      ) : null}

      {SALON_TREATMENT_OPTIONS.map((treatment) => {
        const detail = findSalonTreatmentById(treatment.id);
        const isSelected = selectedServiceIds.includes(treatment.id);
        const disabled = !isSelected && atMax;

        return (
          <button
            key={treatment.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggleTreatmentId(treatment.id)}
            className={`flex w-full cursor-pointer flex-col rounded-[24px] border p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 ${
              isSelected
                ? "border-[#B88E2F] bg-[#B88E2F]/10 ring-2 ring-[#B88E2F]/20"
                : "border-gray-50 bg-white"
            }`}
          >
            <h2 className="text-xl font-semibold text-gray-900">{treatment.name}</h2>
            <p className="mt-1 text-[#666666]">{treatment.subtitle}</p>
            {detail?.priceLabel ? (
              <p className="mt-1 text-[14px] font-medium text-[#B88E2F]">{detail.priceLabel}</p>
            ) : null}
            {isSelected ? (
              <span className="mt-3 inline-flex w-fit rounded-full bg-[#B88E2F] px-3 py-1 text-[14px] font-semibold text-white">
                Seleccionado
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
