import type { CSSProperties } from "react";
import type { EvidenceSourceTypeValue } from "@/lib/delivery-evidence";
import { getEvidenceProviderBrand } from "@/lib/evidence-provider-branding";

type EvidenceProviderMarkProps = {
  type: EvidenceSourceTypeValue | string;
  className?: string;
  size?: "sm" | "md" | "lg";
  decorative?: boolean;
};

const sizeClasses = {
  sm: {
    frame: "h-7 w-7 rounded-lg",
    icon: "h-3.5 w-3.5",
    text: "text-[8px]",
  },
  md: {
    frame: "h-9 w-9 rounded-xl",
    icon: "h-[18px] w-[18px]",
    text: "text-[9px]",
  },
  lg: {
    frame: "h-11 w-11 rounded-xl",
    icon: "h-5 w-5",
    text: "text-[10px]",
  },
};

export default function EvidenceProviderMark({
  type,
  className = "",
  size = "md",
  decorative = false,
}: EvidenceProviderMarkProps) {
  const brand = getEvidenceProviderBrand(type);
  const classes = sizeClasses[size];
  const style = { "--provider-color": `#${brand.brandHex}` } as CSSProperties;
  const accessibilityProps = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": `${brand.label} logo` };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-outline-variant/20 bg-surface text-[var(--provider-color)] shadow-sm ${classes.frame} ${className}`}
      style={style}
      {...accessibilityProps}
    >
      {brand.icon ? (
        <svg className={classes.icon} viewBox="0 0 24 24" fill="currentColor" focusable="false">
          {decorative ? null : <title>{brand.label}</title>}
          <path d={brand.icon.path} />
        </svg>
      ) : (
        <span className={`font-black uppercase tracking-widest ${classes.text}`}>{brand.fallbackText}</span>
      )}
    </span>
  );
}
