"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { YoeGuideBody } from "@/components/guides/yoe-guide-body";

export type GuidePageCta = {
  href: string;
  label: string;
  external?: boolean;
};

type TreatmentGuidePageProps = {
  content: string;
  backHref?: string;
  backLabel?: string;
  /** @deprecated Usar `cta` */
  reserveHref?: string;
  cta?: GuidePageCta;
};

export function TreatmentGuidePage({
  content,
  backHref = "/tratamientos",
  backLabel = "Servicios",
  reserveHref,
  cta,
}: TreatmentGuidePageProps) {
  const primaryCta: GuidePageCta | undefined =
    cta ?? (reserveHref ? { href: reserveHref, label: "Reservar turno" } : undefined);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <main className="mx-auto w-full max-w-md px-4 pt-5 pb-32">
        <header className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-[13px] text-[var(--soft-gray)]/80 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
            {backLabel}
          </Link>
        </header>

        <div className="rounded-2xl border border-white/[0.06] bg-[#161616]/80 px-4 py-5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:px-5 sm:py-6">
          <YoeGuideBody content={content} />
        </div>

        {primaryCta ? (
          <div className="mt-8 space-y-3">
            {primaryCta.external ? (
              <a
                href={primaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--premium-gold)] text-[15px] font-medium tracking-[0.06em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
              >
                {primaryCta.label}
              </a>
            ) : (
              <Link
                href={primaryCta.href}
                className="flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--premium-gold)] text-[15px] font-medium tracking-[0.06em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
              >
                {primaryCta.label}
              </Link>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
