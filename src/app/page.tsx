"use client";

import { BrandLogo } from "@/components/brand-logo";
import {
  BRAND_HOME_INTRO,
  BRAND_NAME_UPPER,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
} from "@/lib/brand";
import { CalendarDays, Home as HomeIcon, Percent, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

let hasShownHomeSplash = false;

const SPLASH_MAX_MS = 900;
const SPLASH_MIN_VISIBLE_MS = 360;
const SPLASH_AFTER_LOAD_MS = 90;

function SplashScreen({ onLogoReady }: { onLogoReady: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#111111] text-white">
      <div className="flex w-full max-w-md flex-col items-center px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <BrandLogo
              size="splash"
              fetchPriority="high"
              decoding="sync"
              onLoad={onLogoReady}
              onError={onLogoReady}
            />
            <div className="text-center text-2xl font-medium leading-tight tracking-[0.1em] font-heading">
              <span className="block">{BRAND_NAME_UPPER}</span>
            </div>
            <div className="text-xs tracking-[0.22em] text-[var(--premium-gold)]/90">
              {BRAND_TAGLINE}
            </div>
          </div>
        </div>

        {/* Frase */}
        <p className="max-w-xs text-center text-sm leading-relaxed text-[var(--soft-gray)]">
          {BRAND_HOME_INTRO}
        </p>
      </div>
    </div>
  );
}

function HomeContent() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111111] text-white">
      {/* Fondo editorial (móvil y escritorio) — el logo va redondo en el header, no a pantalla completa */}
      <div
        aria-hidden
        className="fixed top-0 right-0 left-0 z-0 h-[100svh] bg-[#111111]"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 120% 70% at 50% -15%, rgba(228,202,105,0.14), transparent 52%)",
            "radial-gradient(ellipse 80% 55% at 100% 40%, rgba(206,120,50,0.07), transparent 45%)",
            "radial-gradient(ellipse 60% 50% at 0% 75%, rgba(228,202,105,0.05), transparent 42%)",
            "linear-gradient(to bottom, #151515 0%, #111111 38%, #101010 100%)",
          ].join(","),
        }}
      />

      <main className="relative z-20 mx-auto min-h-screen w-full max-w-md px-5 pt-20 pb-28">
        <header className="flex justify-center">
          <div className="inline-flex flex-col items-center gap-1 text-center">
            <BrandLogo size="header" />
            <div className="text-center text-[20px] font-medium leading-tight tracking-[0.1em] text-white font-heading">
              <span className="block">{BRAND_NAME_UPPER}</span>
            </div>
            <div className="text-[11px] tracking-[0.2em] text-[var(--premium-gold)]/90">
              {BRAND_TAGLINE}
            </div>
            <div className="text-[10px] tracking-[0.14em] text-[var(--soft-gray)]/75">
              {BRAND_SUBTITLE}
            </div>
          </div>
        </header>

        <div className="mt-10 space-y-4 md:mt-14">
          <section className="pb-1">
            <h1 className="sr-only">{BRAND_NAME_UPPER}</h1>
            <div className="mx-auto flex w-[84%] flex-col gap-3">
              <Link
                href="/turnos"
                className="flex h-[52px] items-center justify-center rounded-full bg-[var(--premium-gold)] px-6 text-[16px] font-semibold tracking-[0.14em] text-[var(--on-accent)] shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
              >
                Reservar turno
              </Link>
              <Link
                href="/tratamientos"
                className="flex h-[52px] items-center justify-center rounded-full border border-white/8 bg-black/45 px-6 text-[15px] font-medium tracking-[0.14em] text-white backdrop-blur-[10px]"
              >
                Tratamientos
              </Link>
              <Link
                href="/promociones"
                className="flex h-[52px] items-center justify-center rounded-full border border-white/8 bg-black/45 px-6 text-[15px] font-medium tracking-[0.14em] text-white backdrop-blur-[10px]"
              >
                Promociones
              </Link>
            </div>
          </section>

          <section className="mx-auto w-[84%] space-y-3">
            <Link
              href="/contacto"
              className="flex h-[52px] w-full items-center justify-center rounded-full border border-white/8 bg-black/45 px-6 text-[15px] font-medium tracking-[0.14em] text-white backdrop-blur-[10px]"
            >
              Contacto
            </Link>
          </section>

          <section className="mx-auto w-[84%]">
            <div className="mb-3 text-[10px] tracking-[0.24em] text-[var(--soft-gray)]/70">
              DESTACADO
            </div>
            <div className="rounded-[28px] border border-white/8 bg-black/50 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.4)] backdrop-blur-[14px]">
              <div className="text-[10px] tracking-[0.24em] text-[var(--premium-gold)]">
                COLOR STUDIO
              </div>
              <h2 className="mt-2 text-lg leading-tight text-white font-heading">
                Color, corte y tratamientos
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--soft-gray)]">
                Reservá online con Yanina en Necochea.
              </p>
              <div className="mt-3 flex items-center justify-end gap-3">
                <Link
                  href="/turnos"
                  className="flex h-10 items-center justify-center rounded-full bg-[var(--premium-gold)] px-5 text-[12px] font-semibold tracking-[0.1em] text-[var(--on-accent)]"
                >
                  Reservar
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30">
        <div className="flex w-full items-center justify-between border-t border-white/8 bg-black/60 px-4 py-2.5 backdrop-blur-[16px]">
          <button className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <HomeIcon className="h-5 w-5 text-[var(--premium-gold)]" strokeWidth={1.9} />
            <span className="text-[9px] tracking-[0.12em] text-[var(--premium-gold)]">
              Inicio
            </span>
          </button>
          <Link href="/tratamientos" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <Sparkles className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">
              Tratamientos
            </span>
          </Link>
          <Link href="/turnos" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <CalendarDays className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">
              Turnos
            </span>
          </Link>
          <Link href="/promociones" className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[var(--soft-gray)]/80">
            <Percent className="h-5 w-5 text-[var(--soft-gray)]/90" strokeWidth={1.8} />
            <span className="text-[9px] tracking-[0.12em]">
              Promos
            </span>
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

export default function Home() {
  const [showSplash, setShowSplash] = useState(!hasShownHomeSplash);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);
  const openedAtRef = useRef(0);

  const dismissSplash = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (maxTimerRef.current !== null) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    hasShownHomeSplash = true;
    setShowSplash(false);
  }, []);

  useLayoutEffect(() => {
    if (hasShownHomeSplash || !showSplash) return;
    openedAtRef.current = Date.now();
  }, [showSplash]);

  useEffect(() => {
    if (hasShownHomeSplash) {
      setShowSplash(false);
      return;
    }
    if (!showSplash) return;
    maxTimerRef.current = setTimeout(dismissSplash, SPLASH_MAX_MS);
    return () => {
      if (maxTimerRef.current !== null) {
        clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
    };
  }, [showSplash, dismissSplash]);

  const handleSplashLogoReady = useCallback(() => {
    const elapsed = Date.now() - openedAtRef.current;
    const wait = Math.max(SPLASH_AFTER_LOAD_MS, SPLASH_MIN_VISIBLE_MS - elapsed);
    window.setTimeout(dismissSplash, wait);
  }, [dismissSplash]);

  if (showSplash) {
    return <SplashScreen onLogoReady={handleSplashLogoReady} />;
  }

  return <HomeContent />;
}
