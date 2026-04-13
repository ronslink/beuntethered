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
  return <FacilitatorProfileClient />;
}
