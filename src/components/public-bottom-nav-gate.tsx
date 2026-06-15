"use client";

import { usePathname } from "next/navigation";

import { AppBottomNav } from "@/components/app-bottom-nav";

/** Barra inferior blanca en toda la app pública; oculta en el panel de turnos. */
export function PublicBottomNavGate() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/panel-turnos")) {
    return null;
  }
  return <AppBottomNav />;
}
