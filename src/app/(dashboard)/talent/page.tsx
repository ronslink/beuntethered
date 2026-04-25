import { Metadata } from "next";
import { prisma } from "@/lib/auth";
import TalentPageClient from "./TalentPageClient";

// SEO Metadata
export const metadata: Metadata = {
  title: "Hire Pre-vetted Project Facilitators | Untether",
  description:
    "Access a curated network of elite facilitators who orchestrate AI agents to deliver complex projects. Browse verified facilitators, compare trust scores, and hire with confidence.",
  keywords: [
    "hire AI facilitators",
    "project facilitators",
    "freelance AI talent",
    "pre-vetted facilitators",
  ],
  openGraph: {
    title: "Hire Pre-vetted Project Facilitators",
    description:
      "Curated network of elite facilitators orchestrating AI for complex project delivery.",
    type: "website",
  },
};

export type TalentProfile = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  skills: string[];
  hourly_rate: number;
  trust_score: number;
  total_sprints_completed: number;
  average_ai_audit_score: number;
  availability: string | null;
  platform_tier: string;
};

export default async function PublicTalentPage() {
  const facilitators = await prisma.user.findMany({
    where: { role: "FACILITATOR", onboarding_complete: true },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      skills: true,
      hourly_rate: true,
      trust_score: true,
      total_sprints_completed: true,
      average_ai_audit_score: true,
      availability: true,
      platform_tier: true,
    },
    orderBy: { trust_score: "desc" },
  });

  // Serialize Decimal to number for the client
  const talent: TalentProfile[] = facilitators.map((f) => ({
    ...f,
    hourly_rate: Number(f.hourly_rate),
  }));

  return <TalentPageClient talent={talent} />;
}