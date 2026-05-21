"use client";

import { useState } from "react";

import { event as gaEvent, GA_EVENT_CUSTOMER_SESSION_START } from "@/lib/gtag";

type Props = {
  phone: string;
};

export function ConfirmadoIrPerfilButton({ phone }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const p = phone.trim();
      if (p) {
        const res = await fetch("/api/me/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ phone: p, source: "confirmado" }),
        });
        if (res.ok) {
          gaEvent(GA_EVENT_CUSTOMER_SESSION_START, { login_source: "confirmado" });
        }
      }
    } catch {
      // Si falla el guardado de sesión, igual llevamos al perfil.
    } finally {
      window.location.href = "/perfil";
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--premium-gold)] text-[19px] font-heading text-white disabled:cursor-default disabled:opacity-70"
    >
      {loading ? "Ingresando a perfil..." : "Ir a perfil"}
    </button>
  );
}
