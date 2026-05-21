/**
 * Google Analytics 4 (gtag.js) — helpers para pageviews y eventos custom.
 * Solo actúa en el cliente y en producción (`NODE_ENV === 'production'`).
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

/** Inicio de sesión de cliente (WhatsApp) — mismo nombre que métricas server-side. */
export const GA_EVENT_CUSTOMER_SESSION_START = "customer_session_start";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isGaEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    Boolean(GA_MEASUREMENT_ID) &&
    typeof window.gtag === "function"
  );
}

/**
 * Registra un pageview (SPA). Usar la ruta con query si aplica, p. ej. `/turnos?treatment=Color`.
 */
export function pageview(url: string): void {
  if (!isGaEnabled()) return;
  window.gtag!("config", GA_MEASUREMENT_ID, {
    page_path: url.startsWith("/") ? url : `/${url}`,
  });
}

/**
 * Evento personalizado GA4.
 * @example event('reservation_checkout_start', { treatment_name: 'Keratina' })
 */
export function event(action: string, params?: Record<string, unknown>): void {
  if (!isGaEnabled()) return;
  window.gtag!("event", action, params ?? {});
}
