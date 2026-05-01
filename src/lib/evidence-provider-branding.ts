import type { SimpleIcon } from "simple-icons";
import {
  siCloudflare,
  siDigitalocean,
  siFlydotio,
  siGithub,
  siNetlify,
  siRailway,
  siRender,
  siSupabase,
  siVercel,
} from "simple-icons";
import type { EvidenceSourceTypeValue } from "./delivery-evidence.ts";

export type EvidenceProviderBrand = {
  type: EvidenceSourceTypeValue;
  label: string;
  icon: SimpleIcon | null;
  fallbackText: string;
  brandHex: string;
  kind: "brand" | "generic";
};

export const EVIDENCE_PROVIDER_BRANDS: Record<EvidenceSourceTypeValue, EvidenceProviderBrand> = {
  GITHUB: {
    type: "GITHUB",
    label: "GitHub",
    icon: siGithub,
    fallbackText: "GH",
    brandHex: siGithub.hex,
    kind: "brand",
  },
  VERCEL: {
    type: "VERCEL",
    label: "Vercel",
    icon: siVercel,
    fallbackText: "VC",
    brandHex: siVercel.hex,
    kind: "brand",
  },
  NETLIFY: {
    type: "NETLIFY",
    label: "Netlify",
    icon: siNetlify,
    fallbackText: "NF",
    brandHex: siNetlify.hex,
    kind: "brand",
  },
  CLOUDFLARE: {
    type: "CLOUDFLARE",
    label: "Cloudflare",
    icon: siCloudflare,
    fallbackText: "CF",
    brandHex: siCloudflare.hex,
    kind: "brand",
  },
  RAILWAY: {
    type: "RAILWAY",
    label: "Railway",
    icon: siRailway,
    fallbackText: "RW",
    brandHex: siRailway.hex,
    kind: "brand",
  },
  RENDER: {
    type: "RENDER",
    label: "Render",
    icon: siRender,
    fallbackText: "RE",
    brandHex: siRender.hex,
    kind: "brand",
  },
  FLY: {
    type: "FLY",
    label: "Fly.io",
    icon: siFlydotio,
    fallbackText: "FL",
    brandHex: siFlydotio.hex,
    kind: "brand",
  },
  DIGITALOCEAN: {
    type: "DIGITALOCEAN",
    label: "DigitalOcean",
    icon: siDigitalocean,
    fallbackText: "DO",
    brandHex: siDigitalocean.hex,
    kind: "brand",
  },
  HEROKU: {
    type: "HEROKU",
    label: "Heroku",
    icon: null,
    fallbackText: "H",
    brandHex: "430098",
    kind: "brand",
  },
  SUPABASE: {
    type: "SUPABASE",
    label: "Supabase",
    icon: siSupabase,
    fallbackText: "SB",
    brandHex: siSupabase.hex,
    kind: "brand",
  },
  DOMAIN: {
    type: "DOMAIN",
    label: "Domain",
    icon: null,
    fallbackText: "DNS",
    brandHex: "4f46e5",
    kind: "generic",
  },
  OTHER: {
    type: "OTHER",
    label: "Other evidence",
    icon: null,
    fallbackText: "EV",
    brandHex: "64748b",
    kind: "generic",
  },
};

export function getEvidenceProviderBrand(type: EvidenceSourceTypeValue | string): EvidenceProviderBrand {
  return EVIDENCE_PROVIDER_BRANDS[type as EvidenceSourceTypeValue] ?? EVIDENCE_PROVIDER_BRANDS.OTHER;
}
