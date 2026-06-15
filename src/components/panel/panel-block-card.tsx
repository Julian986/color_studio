"use client";

import { Lock } from "lucide-react";

import { trackPanelClick } from "@/lib/analytics/track";
import { isReservationTimeFocused } from "@/lib/booking/panel-now-focus";

import type { PanelAgendaBlock } from "@/components/panel/panel-types";

function scopeLabel(scope: string) {
  if (scope === "salon") return "Todo el salón";
  return scope;
}

type PanelBlockCardProps = {
  block: PanelAgendaBlock;
  selectedDateKey: string;
  onDelete: () => void;
};

export function PanelBlockCard({ block: b, selectedDateKey, onDelete }: PanelBlockCardProps) {
  const weekly = b.recurrence?.type === "weekly";
  const focused = isReservationTimeFocused(b.timeLocal, selectedDateKey);

  return (
    <article
      className={[
        "overflow-hidden rounded-[22px] border bg-white shadow-[0_6px_24px_rgba(0,0,0,0.08)]",
        focused ? "border-amber-300 ring-2 ring-amber-200/70" : "border-gray-200",
      ].join(" ")}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "rounded-full px-3.5 py-1.5 text-[14px] font-semibold leading-none tabular-nums tracking-tight",
              focused ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-800",
            ].join(" ")}
          >
            {b.timeLocal}
          </span>
          <span className="text-[10px] font-semibold tracking-[0.14em] text-amber-700/80">BLOQUEO</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Lock className="h-5 w-5 shrink-0 text-amber-700" strokeWidth={2} />
          <h3 className="font-heading text-[18px] font-bold text-gray-900">Bloqueo de agenda</h3>
        </div>

        <p className="mt-1 text-[14px] text-gray-600">
          {scopeLabel(b.scope)} · {b.durationMinutes} min
          {weekly ? " · Semanal" : ""}
        </p>

        {weekly && b.recurrence?.untilDateKey ? (
          <p className="mt-0.5 text-[12px] text-gray-500">Hasta {b.recurrence.untilDateKey}</p>
        ) : null}

        {b.notes ? (
          <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-[14px] leading-snug text-gray-700">{b.notes}</p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            trackPanelClick("delete_block", "card");
            onDelete();
          }}
          className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-white text-[14px] font-semibold text-red-600 transition hover:bg-red-50"
        >
          Eliminar bloqueo
        </button>
      </div>
    </article>
  );
}
