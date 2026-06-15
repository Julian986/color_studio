"use client";

import {
  Instagram,
  MapPin,
} from "lucide-react";
import Link from "next/link";

import {
  BRAND_ADDRESS_LINE,
  BRAND_INSTAGRAM_HANDLE,
  BRAND_INSTAGRAM_URL,
  BRAND_MAPS_EMBED_SRC,
  BRAND_MAPS_SHARE_URL,
  BRAND_WHATSAPP_DISPLAY,
  BRAND_WHATSAPP_URL,
} from "@/lib/brand";

function WhatsappIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 3.1c-4.9 0-8.9 3.9-8.9 8.8 0 1.6.4 3.1 1.3 4.4L3 21l4.9-1.3c1.3.7 2.7 1.1 4.1 1.1 4.9 0 8.9-3.9 8.9-8.8C20.9 7 16.9 3.1 12 3.1zm0 15.7c-1.3 0-2.5-.3-3.6-.9l-.3-.2-2.9.8.8-2.8-.2-.3c-.8-1.1-1.2-2.4-1.2-3.8C4.6 8 7.9 4.8 12 4.8s7.4 3.2 7.4 7.2-3.3 7.2-7.4 7.2zm4-5.2c-.2-.1-1.1-.6-1.2-.6-.2-.1-.3-.1-.5.1-.1.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.8-.3-1.5-.9-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.4.1-.1.1-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.5-1.2-.7-1.6-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.1.9 2.3.1.2 1.6 2.4 3.8 3.3.5.2.9.3 1.2.4.5.2 1 .2 1.3.1.4-.1 1.1-.4 1.3-.9.2-.5.2-1 .2-1.1-.1-.1-.2-.2-.4-.3z"
      />
    </svg>
  );
}

type ContactItem = {
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
};

const contactItems: ContactItem[] = [
  {
    label: "Dirección",
    description: BRAND_ADDRESS_LINE,
    icon: MapPin,
  },
  {
    label: "WhatsApp",
    description: BRAND_WHATSAPP_DISPLAY,
    icon: WhatsappIcon,
    href: BRAND_WHATSAPP_URL,
  },
  {
    label: "Instagram",
    description: BRAND_INSTAGRAM_HANDLE,
    icon: Instagram,
    href: BRAND_INSTAGRAM_URL,
  },
  // {
  //   label: "Horarios",
  //   description: "Ver detalle de horarios de atención",
  //   icon: CalendarClock,
  // },
];

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-24">
        <header className="mb-5 text-center">
          <h1 className="text-[28px] leading-none font-heading">Contacto</h1>
        </header>

        <section className="mb-4 rounded-2xl border border-white/8 bg-[#181818] px-3 py-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.65)]">
          <div className="divide-y divide-white/10">
            {contactItems.map((item) => {
              const Icon = item.icon;

              const content = (
                <div className="flex items-center justify-between px-1 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/35">
                      <Icon
                        className={`text-[var(--soft-gray)]/85 ${
                          item.label === "WhatsApp" ? "h-5 w-5" : "h-4.5 w-4.5"
                        }`}
                        strokeWidth={1.7}
                      />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-[var(--soft-gray)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--soft-gray)]/60">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--soft-gray)]/50">›</span>
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.label}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/6 bg-[#141414] p-3">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--soft-gray)]/70">
            Ubicación en mapa
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/8 bg-black/40">
            <iframe
              src={BRAND_MAPS_EMBED_SRC}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-48 w-full border-0"
              allowFullScreen
            />
          </div>
          <Link
            href={BRAND_MAPS_SHARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-[11px] text-[var(--premium-gold)]"
          >
            <span>Ver mapa en Google Maps</span>
          </Link>
        </section>

        {/*
        <section
          id="detalle-horarios"
          className="mt-4 rounded-2xl border border-white/8 bg-[#181818] p-3"
        >
          <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--soft-gray)]/70">
            Detalle de horarios
          </p>
          <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-[var(--soft-gray)]/80">
            <p className="font-semibold text-[var(--premium-gold)]">
              Horarios en los que NO se toman turnos
            </p>
            <p>Lunes a Miércoles · 12:00 a 18:00</p>
            <p>Viernes · 12:00 a 18:00</p>
            <p className="mt-2 font-semibold text-[var(--premium-gold)]">Horarios disponibles para turnos</p>
            <p>Lunes a Miércoles · 08:00–11:00 · 15:00–17:00</p>
            <p>Jueves · 08:00–11:00 · 15:00–19:00</p>
            <p>Viernes · 08:00–11:00 · 15:00–17:00</p>
            <p>Sábados · 08:00–12:00</p>
          </div>
        </section>
        */}
      </main>
    </div>
  );
}

