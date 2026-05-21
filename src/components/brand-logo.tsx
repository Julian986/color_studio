import type { ImgHTMLAttributes } from "react";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

export { BRAND_LOGO_SRC };

const sizeClass = {
  splash:
    "h-52 w-52 max-h-[min(56vw,280px)] max-w-[min(56vw,280px)] rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-2 ring-[var(--premium-gold)]/20 sm:h-[15rem] sm:w-[15rem] sm:max-h-[300px] sm:max-w-[300px]",
  header:
    "h-[7.25rem] w-[7.25rem] rounded-full object-cover shadow-[0_8px_28px_rgba(0,0,0,0.4)] ring-2 ring-[var(--premium-gold)]/20",
  page: "h-28 w-28 rounded-full object-cover ring-2 ring-white/10",
  compact: "h-24 w-24 rounded-full object-cover ring-2 ring-white/10",
} as const;

export type BrandLogoSize = keyof typeof sizeClass;

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  size?: BrandLogoSize;
  alt?: string;
};

export function BrandLogo({
  size = "header",
  className = "",
  alt = BRAND_NAME,
  ...rest
}: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      width={512}
      height={512}
      decoding="async"
      className={`shrink-0 ${sizeClass[size]} ${className}`.trim()}
      {...rest}
    />
  );
}
