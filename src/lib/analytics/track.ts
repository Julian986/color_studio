import { event as gaEvent } from "@/lib/gtag";

/** Evento personalizado GA4. */
export function trackEvent(
  action: string,
  params?: Record<string, unknown> & { category?: string; label?: string },
): void {
  const { category, label, ...rest } = params ?? {};
  gaEvent(action, {
    ...(category ? { event_category: category } : {}),
    ...(label ? { event_label: label } : {}),
    ...rest,
  });
}

export function trackNavClick(destination: string): void {
  trackEvent("nav_click", { category: "navigation", label: destination });
}

export function trackWizardContinue(step: number): void {
  trackEvent("wizard_continue", { category: "appointments", label: `step_${step}` });
}

export function trackPanelClick(
  action: string,
  label?: string,
  extra?: Record<string, unknown>,
): void {
  trackEvent(action, { category: "panel", ...(label ? { label } : {}), ...extra });
}

/** Ítem del menú en /perfil (Mis turnos, Historial, etc.). */
export function trackPerfilMenuClick(item: string): void {
  trackEvent("perfil_menu_click", { category: "navigation", label: item });
}
