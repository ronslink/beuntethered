import { Metadata } from "next";
import { prisma } from "@/lib/auth";
import FacilitatorProfileClient from "./FacilitatorProfileClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        platform_tier: true,
        total_sprints_completed: true,
        role: true,
      },
    });

    if (!user || user.role !== "FACILITATOR") {
      return {
        title: "Facilitator Not Found | beuntethered",
        description: "This facilitator profile doesn't exist.",
      };
    }

    const name = user.name || "Unnamed Facilitator";

    return {
      title: `${name} — Expert Project Facilitator | beuntethered`,
      description: `Hire ${name}, a ${user.platform_tier} tier facilitator with ${user.total_sprints_completed} completed sprints.`,
    };
  } catch {
    return {
      title: "Facilitator | beuntethered",
      description: "View facilitator profile on beuntethered.",
    };
  }
}

export default async function FacilitatorProfilePage({ params }: Props) {
  const { id } = await params;

  let facilitatorData: any = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        platform_tier: true,
        trust_score: true,
        total_sprints_completed: true,
        average_ai_audit_score: true,
        hourly_rate: true,
        preferred_llm: true,
        emailVerified: true,
      },
    });

    if (user && user.role === "FACILITATOR") {
      // Must convert decimal and date types for Next.js 14/15 server-to-client boundaries if needed,
      // though App Router usually handles Date implicitly if we don't strict JSON it unless turbopack fails.
      // But passing raw Decimal throws error. We convert hourly_rate.
      facilitatorData = {
        ...user,
        hourly_rate: user.hourly_rate ? Number(user.hourly_rate) : 0,
      };
    }
  } catch (error) {
    console.error("Failed to fetch facilitator:", error);
  }

  return <FacilitatorProfileClient facilitator={facilitatorData} />;
}
