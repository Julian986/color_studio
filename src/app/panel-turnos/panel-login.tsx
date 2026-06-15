"use client";

import { BrandLogo } from "@/components/brand-logo";
import { panelCard, panelInput, panelPage, panelPrimaryBtn } from "@/components/panel/panel-ui";
import { trackPanelClick } from "@/lib/analytics/track";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PanelLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/panel-turnos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo ingresar.");
        return;
      }
      trackPanelClick("panel_login", "success");
      router.refresh();
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${panelPage} flex flex-col items-center justify-center px-4 pb-20 pt-8`}>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <BrandLogo size="compact" className="mx-auto" />
        <div>
          <h1 className="font-heading text-[28px] font-bold text-[#B88E2F]">Panel de turnos</h1>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-gray-600">
            Ingresá la contraseña para ver y gestionar la agenda.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`w-full max-w-sm ${panelCard} p-6`}>
        <label htmlFor="panel-password" className="text-[12px] font-medium text-gray-500">
          Contraseña
        </label>
        <input
          id="panel-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={panelInput}
        />
        {error ? (
          <p role="alert" className="mt-3 text-center text-[13px] text-red-600">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading || !password} className={`mt-5 ${panelPrimaryBtn}`}>
          {loading ? "Ingresando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
