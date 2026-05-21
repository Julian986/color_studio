import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Rutas estáticas que deben seguir públicas aunque más adelante se proteja el panel en middleware. */
const PUBLIC_ASSET_PATHS = new Set([
  "/manifest.json",
  "/manifest-panel.webmanifest",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon-48.png",
  "/favicon-64.png",
  "/apple-touch-icon.png",
  "/og-image.jpg",
  "/icon-192.png",
  "/icon-512.png",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ASSET_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/panel-turnos")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manifest.json",
    "/manifest-panel.webmanifest",
    "/favicon-16.png",
    "/favicon-32.png",
    "/favicon-48.png",
    "/favicon-64.png",
    "/apple-touch-icon.png",
    "/og-image.jpg",
    "/icon-192.png",
    "/icon-512.png",
    "/panel-turnos",
    "/panel-turnos/:path*",
  ],
};
