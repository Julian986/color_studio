/** Identidad Colorstudio Moscardini — fuente única para la app. */

export const BRAND_NAME = "Colorstudio Moscardini";
export const BRAND_NAME_UPPER = "COLORSTUDIO MOSCARDINI";
export const BRAND_CLIENT_NAME = "Yanina Moscardini";
export const BRAND_TAGLINE = "Color · Corte · Tratamientos";
export const BRAND_SUBTITLE = "Necochea";

export const BRAND_LOGO_SRC = "/logo_colorstudio.webp";
export const BRAND_HERO_IMAGE_SRC = BRAND_LOGO_SRC;

/** Dígitos internacionales para wa.me (sin + ni espacios). */
export const BRAND_WHATSAPP_WA_ID = "5492262485251";

export const BRAND_WHATSAPP_DISPLAY = "+54 9 2262 48-5251";

export const BRAND_WHATSAPP_URL = `https://wa.me/${BRAND_WHATSAPP_WA_ID}`;

export function brandWhatsAppInquiryUrl(message: string): string {
  return `${BRAND_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export const BRAND_INSTAGRAM_URL =
  "https://www.instagram.com/colorstudio_moscardini?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

export const BRAND_INSTAGRAM_HANDLE = "@colorstudio_moscardini";

export const BRAND_ADDRESS_LINE = "Calle 67 nº 3465 · Necochea";
export const BRAND_ADDRESS_DETAIL = "Entre calles 74 y 76";

export const BRAND_MAPS_SHARE_URL = "https://maps.app.goo.gl/8KuzgjcD9LSGV6Hf8";

export const BRAND_MAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d24961.915040187698!2d-58.78774208916012!3d-38.55129819999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x958fbd5986d989a1%3A0x44e9a038c4ebe711!2sColorstudio_moscardini!5e0!3m2!1ses!2sar!4v1779391865576!5m2!1ses!2sar";

export const BRAND_HOME_INTRO =
  "Reservá tu turno online: corte, color, hidratación, balayage y mechas en Necochea.";

/** Aviso en servicios / turnos mientras Yanina confirma tiempos y precios. */
export const PROVISIONAL_SCHEDULE_NOTE =
  "Duraciones y precios provisionales: los confirmamos con Yanina";
