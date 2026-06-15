import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import { BRAND_LOGO_SRC } from "@/components/brand-logo";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { PublicBottomNavGate } from "@/components/public-bottom-nav-gate";
import { BRAND_NAME } from "@/lib/brand";
import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

/** Query en favicons / PWA; subir versión al cambiar iconos (cache de WhatsApp / navegadores). */
const ASSET_V = "5";

/** Vista previa al compartir URL (1200×630, generada con `npm run icons`). */
const OG_IMAGE_PATH = "/og-image.jpg";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const siteOrigin = resolvePublicSiteOrigin(h);
  const metadataBase = new URL(`${siteOrigin}/`);
  /** Sin `?v=` en la URL: algunos scrapers de Meta fallan con query en og:image. */
  const ogImageAbsolute = `${siteOrigin}${OG_IMAGE_PATH}`;

  return {
    metadataBase,
    title: {
      default: BRAND_NAME,
      template: `%s | ${BRAND_NAME}`,
    },
    description: `Reservá tu turno en ${BRAND_NAME}. Color, corte y tratamientos en Necochea.`,
    icons: {
      icon: [
        { url: `/favicon-64.png?v=${ASSET_V}`, sizes: "64x64", type: "image/png" },
        { url: `/favicon-48.png?v=${ASSET_V}`, sizes: "48x48", type: "image/png" },
        { url: `/favicon-32.png?v=${ASSET_V}`, sizes: "32x32", type: "image/png" },
        { url: `/favicon-16.png?v=${ASSET_V}`, sizes: "16x16", type: "image/png" },
      ],
      apple: { url: `/apple-touch-icon.png?v=${ASSET_V}`, sizes: "180x180" },
      shortcut: `/favicon-64.png?v=${ASSET_V}`,
    },
    manifest: "/manifest.json",
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: `${siteOrigin}/`,
      siteName: BRAND_NAME,
      title: `${BRAND_NAME} · Reserva online`,
      description: "Reservá tu turno online",
      images: [
        {
          url: ogImageAbsolute,
          secureUrl: ogImageAbsolute,
          width: 1200,
          height: 630,
          alt: BRAND_NAME,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageAbsolute],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <link rel="preload" href={BRAND_LOGO_SRC} as="image" />
      </head>
      <body
        className={`${montserrat.variable} ${playfair.variable} min-h-screen bg-[#111111] text-white antialiased`}
      >
        <GoogleAnalytics />
        {children}
        <PublicBottomNavGate />
      </body>
    </html>
  );
}
