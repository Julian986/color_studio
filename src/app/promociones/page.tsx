"use client";

import { Wind } from "lucide-react";
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
    </div>
  );
}
