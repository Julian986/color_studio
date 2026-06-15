"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { trackEvent } from "@/lib/analytics/track";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  trackAction: string;
  trackCategory?: string;
  trackLabel?: string;
};

export function TrackedLink({
  trackAction,
  trackCategory = "cta",
  trackLabel,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackEvent(trackAction, { category: trackCategory, ...(trackLabel ? { label: trackLabel } : {}) });
        onClick?.(e);
      }}
    />
  );
}
