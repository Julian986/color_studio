/** Categorías para filtrar en la app de turnos. */
export const TREATMENT_CATEGORIES = ["Servicios"] as const;

export type TreatmentCategory = (typeof TREATMENT_CATEGORIES)[number];

const PROVISIONAL_DURATION_LABEL = "Duración provisional · a confirmar con el salón";
const PRICE_PENDING_LABEL = "Precio a confirmar en salón";

export type SalonTreatment = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: TreatmentCategory;
  durationLabel: string;
  durationMinutes: number;
  imageUrl: string;
  priceLabel: string;
};

/** Duraciones por defecto hasta confirmación de Yanina (afectan grilla de turnos). */
export const SALON_TREATMENTS: SalonTreatment[] = [
  {
    id: "corte-cabello",
    name: "Corte de cabello",
    subtitle: `~45 min · ${PRICE_PENDING_LABEL}`,
    description: "Corte y terminación según tu estilo y tipo de cabello.",
    category: "Servicios",
    durationLabel: PROVISIONAL_DURATION_LABEL,
    durationMinutes: 45,
    imageUrl: "/logo_colorstudio.webp",
    priceLabel: PRICE_PENDING_LABEL,
  },
  {
    id: "color",
    name: "Color",
    subtitle: `~2 h · ${PRICE_PENDING_LABEL}`,
    description: "Coloración profesional adaptada a tu base y el resultado que buscás.",
    category: "Servicios",
    durationLabel: PROVISIONAL_DURATION_LABEL,
    durationMinutes: 120,
    imageUrl: "/logo_colorstudio.webp",
    priceLabel: PRICE_PENDING_LABEL,
  },
  {
    id: "hidratacion-capilar",
    name: "Hidratación capilar",
    subtitle: `~1 h · ${PRICE_PENDING_LABEL}`,
    description: "Tratamiento de hidratación para recuperar suavidad y brillo.",
    category: "Servicios",
    durationLabel: PROVISIONAL_DURATION_LABEL,
    durationMinutes: 60,
    imageUrl: "/logo_colorstudio.webp",
    priceLabel: PRICE_PENDING_LABEL,
  },
  {
    id: "balayage",
    name: "Balayage",
    subtitle: `~2 h 30 · ${PRICE_PENDING_LABEL}`,
    description: "Técnica de iluminación gradual para un efecto natural.",
    category: "Servicios",
    durationLabel: PROVISIONAL_DURATION_LABEL,
    durationMinutes: 150,
    imageUrl: "/logo_colorstudio.webp",
    priceLabel: PRICE_PENDING_LABEL,
  },
  {
    id: "mechas",
    name: "Mechas",
    subtitle: `~2 h · ${PRICE_PENDING_LABEL}`,
    description: "Mechas y contrastes según diagnóstico de tu cabello.",
    category: "Servicios",
    durationLabel: PROVISIONAL_DURATION_LABEL,
    durationMinutes: 120,
    imageUrl: "/logo_colorstudio.webp",
    priceLabel: PRICE_PENDING_LABEL,
  },
];

export function findSalonTreatmentByName(name: string): SalonTreatment | undefined {
  const t = name.trim();
  return SALON_TREATMENTS.find((x) => x.name === t);
}

export function findSalonTreatmentById(id: string): SalonTreatment | undefined {
  return SALON_TREATMENTS.find((x) => x.id === id);
}

export function panelDurationLabel(treatmentName: string, category: string): string {
  const byName = findSalonTreatmentByName(treatmentName);
  if (byName) return byName.durationLabel;
  if (category === "Servicios") return PROVISIONAL_DURATION_LABEL;
  return "Consultar";
}

/** Máximo de servicios en una misma visita (ej. corte + color). */
export const MAX_SERVICES_PER_BOOKING = 3;

/** Orden estable, sin duplicados, solo ids válidos del catálogo. */
export function normalizeServiceIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id) || !findSalonTreatmentById(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SERVICES_PER_BOOKING) break;
  }
  return out;
}

export function primaryTreatmentIdFromServiceIds(ids: string[]): string {
  return normalizeServiceIds(ids)[0] ?? "";
}

export function isValidServiceSelection(ids: string[]): boolean {
  const normalized = normalizeServiceIds(ids);
  return normalized.length > 0;
}

export function totalDurationMinutesForServiceIds(ids: string[]): number {
  return normalizeServiceIds(ids).reduce((acc, id) => {
    return acc + (findSalonTreatmentById(id)?.durationMinutes ?? 0);
  }, 0);
}

/** Alias legacy (Épica). */
export const normalizeEpicaServiceIds = normalizeServiceIds;
