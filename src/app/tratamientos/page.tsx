"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { PROVISIONAL_SCHEDULE_NOTE } from "@/lib/brand";
import { SALON_TREATMENTS } from "@/lib/treatments/catalog";

export default function TratamientosPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
        <header className="mb-5 flex items-center justify-between">
          <Link href="/" aria-label="Volver a inicio" className="cursor-pointer text-[var(--soft-gray)]/88">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
          </Link>
          <h1 className="text-[30px] leading-none font-heading">Servicios</h1>
          <span className="h-5 w-5" />
        </header>

        <div className="mb-6 flex justify-center">
          <BrandLogo size="header" />
        </div>

        <p className="mb-6 rounded-2xl border border-[var(--premium-gold)]/35 bg-[rgba(206,120,50,0.1)] px-4 py-3 text-center text-[12px] leading-relaxed text-[var(--soft-gray)]/88">
          {PROVISIONAL_SCHEDULE_NOTE}
        </p>

        <ul className="space-y-4">
          {SALON_TREATMENTS.map((service) => (
            <li
              key={service.id}
              className="overflow-hidden rounded-[24px] border border-white/8 bg-[#171717] shadow-[0_12px_26px_rgba(0,0,0,0.28)]"
            >
              <div className="p-4">
                <h2 className="text-[20px] font-heading text-[var(--premium-gold)]">{service.name}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--soft-gray)]/82">
                  {service.description}
                </p>
                <p className="mt-3 text-[12px] text-[var(--soft-gray)]/58">{service.subtitle}</p>
                <p className="mt-1 text-[12px] font-medium text-[var(--premium-gold)]/90">
                  {service.priceLabel}
                </p>
                <Link
                  href={`/turnos?treatment=${encodeURIComponent(service.id)}`}
                  className="mt-4 flex h-11 items-center justify-center rounded-full bg-[var(--premium-gold)] text-[14px] font-semibold tracking-[0.08em] text-[var(--on-accent)]"
                >
                  Reservar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
