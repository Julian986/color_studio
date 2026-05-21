"use client";

import { CalendarDays, Home as HomeIcon, Percent, Sparkles, User, Wind } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function PromotionsPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
        <header className="mb-4 text-center">
          <h1 className="text-[34px] leading-none font-heading">Servicios</h1>
          <p className="mt-2 text-[11px] tracking-[0.14em] text-[var(--premium-gold)]/90 uppercase">
            Colorstudio Moscardini · Necochea
          </p>
        </header>

        <p className="mb-4 text-center text-[11px] leading-relaxed text-[var(--soft-gray)]/85">
          Precios y duraciones provisionales: los confirmamos con Yanina en salón.
        </p>

        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#1a1a1a] shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
          <Image
            src="/logo_colorstudio.webp"
            alt="Colorstudio Moscardini — servicios"
            width={900}
            height={1200}
            className="h-auto w-full"
            priority
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/tratamientos"
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] text-[13px] text-[var(--soft-gray)]"
          >
            <Wind className="h-4 w-4 text-[var(--premium-gold)]" strokeWidth={1.8} />
            Ver detalle
          </Link>
          <Link
            href="/turnos"
            className="flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--premium-gold)] text-[13px] font-medium text-white"
          >
            Reservar turno
          </Link>
        </div>
      </main>

      <nav className="fixed right-0 bottom-0 left-0 z-30">
        <div className="flex w-full items-center justify-between border-t border-white/8 bg-black/60 px-4 py-2.5 backdrop-blur-[16px]">
          <Link href="/" className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <HomeIcon className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.9} />
            <span className="text-[9px] tracking-[0.12em] text-[var(--soft-gray)]/80">
              Inicio
            </span>
          </Link>
          <Link href="/tratamientos" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <Sparkles className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Tratamientos</span>
          </Link>
          <Link href="/turnos" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <CalendarDays className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Turnos</span>
          </Link>
          <Link href="/promociones" className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <Percent className="h-5 w-5 text-[var(--premium-gold)]" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em] text-[var(--premium-gold)]">Promos</span>
          </Link>
          <Link href="/perfil" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <User className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
