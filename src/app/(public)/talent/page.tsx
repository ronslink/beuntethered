import { Metadata } from "next";
import TalentPageClient from "./TalentPageClient";

// SEO Metadata
export const metadata: Metadata = {
  title: "Hire Expert Pre-vetted Project Facilitators | beuntethered",
  description:
    "Access a curated network of elite facilitators ready to deliver complex projects. Browse verified experts, compare trust scores, and hire with confidence.",
  keywords: [
    "hire developers",
    "project facilitators",
    "freelance talent",
    "pre-vetted experts",
  ],
  openGraph: {
    title: "Hire Expert Pre-vetted Project Facilitators",
    description:
      "Curated network of elite facilitators for complex project delivery.",
    type: "website",
  },
};

export default function PublicTalentPage() {
  return <TalentPageClient />;
}