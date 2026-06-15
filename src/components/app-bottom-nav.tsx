"use client";

import { CalendarDays, Home as HomeIcon, Percent, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { trackNavClick } from "@/lib/analytics/track";

const GOLD = "#B88E2F";

export const APP_BOTTOM_NAV_HEIGHT_CLASS = "h-16";

const nav = [
  { href: "/", label: "Inicio", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/tratamientos", label: "Servicios", Icon: Sparkles, match: (p: string) => p.startsWith("/tratamientos") },
  { href: "/turnos", label: "Turnos", Icon: CalendarDays, match: (p: string) => p.startsWith("/turnos") },
  { href: "/promociones", label: "Promos", Icon: Percent, match: (p: string) => p.startsWith("/promociones") },
  { href: "/perfil", label: "Perfil", Icon: User, match: (p: string) => p.startsWith("/perfil") },
] as const;

export function AppBottomNavBar() {
  const pathname = usePathname() ?? "";

  return (
    <div
      className={`app-bottom-nav__inner mx-auto flex ${APP_BOTTOM_NAV_HEIGHT_CLASS} max-w-md items-center justify-between px-4`}
    >
      {nav.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-1"
            onClick={() => trackNavClick(label)}
          >
            <Icon
              className="app-bottom-nav__icon"
              strokeWidth={1.8}
              fill="none"
              style={{ color: active ? GOLD : "#9CA3AF" }}
            />
            <span className="app-bottom-nav__label" style={{ color: active ? GOLD : "#6B7280" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function AppBottomNavShell() {
  return (
    <nav
      aria-label="Navegación principal"
      className="app-bottom-nav fixed right-0 bottom-0 left-0 z-50 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <AppBottomNavBar />
    </nav>
  );
}

export function AppBottomNav() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(<AppBottomNavShell />, document.body);
}
