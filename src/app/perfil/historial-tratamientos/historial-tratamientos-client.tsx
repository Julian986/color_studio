"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { usePerfilSession } from "@/components/perfil/perfil-session-provider";
import type { CustomerReservationPublic } from "@/lib/reservations/customer-public-serialize";
import { formatShortDateFromKey, isPastSessionForHistory } from "@/lib/reservations/customer-ui-copy";

type GroupRow = { treatmentName: string; sessions: number; lastDateKey: string };

export function HistorialTratamientosClient() {
  const { me, reservations: ctxReservations } = usePerfilSession();

  const [rows, setRows] = useState<CustomerReservationPublic[] | null>(ctxReservations);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxReservations !== null) setRows(ctxReservations);
  }, [ctxReservations]);

  useEffect(() => {
    if (me === "guest") {
      setError("Iniciá sesión desde Perfil con tu WhatsApp.");
      setRows([]);
    }
  }, [me]);

  const groups = useMemo(() => {
    const list = (rows ?? []).filter((r) => isPastSessionForHistory(r));
    const map = new Map<string, { count: number; lastKey: string }>();
    for (const r of list) {
      const key = r.treatmentName.trim() || "Tratamiento";
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { count: 1, lastKey: r.dateKey });
        continue;
      }
      cur.count += 1;
      if (r.dateKey > cur.lastKey) cur.lastKey = r.dateKey;
    }
    const out: GroupRow[] = [...map.entries()].map(([treatmentName, v]) => ({
      treatmentName,
      sessions: v.count,
      lastDateKey: v.lastKey,
    }));
    out.sort((a, b) => b.lastDateKey.localeCompare(a.lastDateKey));
    return out;
  }, [rows]);

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-28">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/perfil"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
          aria-label="Volver al perfil"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-bold leading-tight text-gray-900">Historial</h1>
          <p className="mt-0.5 text-[16px] text-gray-500">Sesiones realizadas</p>
        </div>
      </header>

      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[16px] text-amber-900">
          {error}{" "}
          <Link href="/perfil#acceso" className="font-semibold text-[#B88E2F] underline-offset-2 hover:underline">
            Ir a acceso
          </Link>
        </p>
      ) : null}

      <p className="mb-5 text-[16px] leading-relaxed text-gray-600">
        Contamos como sesión realizada los turnos ya pasados o marcados como realizados; no incluimos cancelados ni
        inasistencias.
      </p>

      {rows === null ? (
        <p className="py-10 text-center text-[16px] text-gray-500">Cargando…</p>
      ) : groups.length === 0 ? (
        <p className="py-10 text-center text-[16px] text-gray-500">
          Todavía no hay sesiones pasadas registradas con tu WhatsApp.
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => (
            <li
              key={g.treatmentName}
              className="rounded-[24px] border border-gray-50 bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
            >
              <p className="text-[18px] font-semibold text-gray-900">{g.treatmentName}</p>
              <p className="mt-2 text-[16px] text-gray-600">
                <span className="font-bold text-[#B88E2F]">{g.sessions}</span>{" "}
                {g.sessions === 1 ? "sesión realizada" : "sesiones realizadas"}
              </p>
              <p className="mt-1 text-[15px] text-gray-400">Última: {formatShortDateFromKey(g.lastDateKey)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
