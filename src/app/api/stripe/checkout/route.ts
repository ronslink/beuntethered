import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { milestoneId } = await req.json();
    if (!milestoneId) return new NextResponse("Milestone ID Required", { status: 400 });

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone || milestone.project.client_id !== user.id) {
      return new NextResponse("Invalid Authority", { status: 403 });
    }

    if (milestone.status !== "PENDING") {
      return new NextResponse("Milestone is not pending computation", { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Untether Escrow: ${milestone.project.title}`,
              description: `Milestone Funding: ${milestone.title}`,
            },
            unit_amount: Math.round(Number(milestone.amount) * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
         // Secure metadata injection for stateless webhook extraction natively!
         metadata: {
            milestone_id: milestone.id,
            project_id: milestone.project.id,
            billing_type: milestone.project.billing_type,
         }
      },
      success_url: `${process.env.NEXTAUTH_URL}/command-center?id=${milestone.project.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/command-center?id=${milestone.project.id}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Injection Fault:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
