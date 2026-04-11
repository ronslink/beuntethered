"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitBid({
  projectId,
  proposedAmount,
  estimatedDays,
  technicalApproach
}: {
  projectId: string;
  proposedAmount: number;
  estimatedDays: number;
  technicalApproach: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "DEVELOPER") throw new Error("Only strictly configured Experts can submit Marketplace parameter bids.");

    // Enforce duplication execution constraint logically
    const existingBid = await prisma.bid.findFirst({
       where: { project_id: projectId, developer_id: user.id }
    });

    if (existingBid) {
       throw new Error("Constraints lock: You have an actively unresolved bid pending on this exact node parameter.");
    }

    // Capture bid executing across logic loops seamlessly
    await prisma.bid.create({
       data: {
         project_id: projectId,
         developer_id: user.id,
         proposed_amount: proposedAmount,
         estimated_days: estimatedDays,
         technical_approach: technicalApproach,
         ai_translation_summary: "Pending AI Contractual Analysis Constraint Map...", // Mocking pending AI response map
         status: "PENDING"
       }
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true }
    });

    if (project?.client?.email) {
      try {
        await resend.emails.send({
          from: "Untether Marketplace <marketplace@untether.network>",
          to: project.client.email,
          subject: `New Bid Received on ${project.title}!`,
          html: `
            <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
              <h2 style="color: #6366f1;">Marketplace Execution Alert</h2>
              <p>An expert developer has formally submitted a bid resolving your Scope of Work.</p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
                <h3 style="margin-top:0;">Proposed Valuation: $${proposedAmount}</h3>
                <p style="color: #475569; font-size: 14px;">${technicalApproach}</p>
              </div>
              <a href="${process.env.NEXTAUTH_URL}/projects/${project.id}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review Proposal</a>
            </div>
          `
        });
      } catch (e) {
        console.error("Resend Trigger Warning: Output failure against standard boundaries", e);
      }
    }

    // Revalidate the entire Marketplace cache ensuring buttons actively update
    revalidatePath("/marketplace");
    
    return { success: true };
  } catch (error: any) {
    console.error("Bid Fault:", error);
    return { success: false, error: error.message };
  }
}

export async function acceptBid(bidId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized array logic resolution.");

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { project: { include: { milestones: true } } }
    });

    if (!bid || bid.project.client_id !== user.id || bid.project.status !== "OPEN_BIDDING") {
      throw new Error("Invalid parameters formatting Escrow constraint. Validation locked.");
    }

    const projectId = bid.project_id;

    // Secure Transaction locking entire db matrix cleanly validating loops reliably
    await prisma.$transaction(async (tx) => {
      // 1. Lock the strictly accepted Bid state natively
      await tx.bid.update({
        where: { id: bidId },
        data: { status: "ACCEPTED" }
      });

      // 2. Reject all divergent conflicting mappings gracefully
      await tx.bid.updateMany({
        where: { project_id: projectId, id: { not: bidId } },
        data: { status: "REJECTED" }
      });

      // 3. Mathematical mapping scaling logic natively preserving decimal constraints perfectly
      const originalTotal = bid.project.milestones.reduce((acc, m) => acc + Number(m.amount), 0);
      const proposedTotal = Number(bid.proposed_amount);

      if (originalTotal !== proposedTotal && originalTotal > 0) {
        const ratio = proposedTotal / originalTotal;

        for (const m of bid.project.milestones) {
           const newAmount = Number(m.amount) * ratio;
           // MUST round to explicitly exactly 2 fractional outputs otherwise Stripe triggers payload fault boundaries!
           const roundedAmount = Math.round(newAmount * 100) / 100;
           
           await tx.milestone.update({
             where: { id: m.id },
             data: { amount: roundedAmount }
           });
        }
      }

      // 4. Force Project object correctly into Escrow pipeline matching 'ACTIVE'
      await tx.project.update({
        where: { id: projectId },
        data: {
          developer_id: bid.developer_id,
          status: "ACTIVE"
        }
      });
    });

    const acceptedBid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { developer: true, project: true }
    });

    const rejectedBids = await prisma.bid.findMany({
      where: { project_id: projectId, status: "REJECTED" },
      include: { developer: true }
    });

    if (acceptedBid?.developer?.email) {
       try {
         await resend.emails.send({
           from: "Untether Escrow Engine <engine@untether.network>",
           to: acceptedBid.developer.email,
           subject: `[ACCEPTED] Project Parameter Won: ${acceptedBid.project.title}`,
           html: `
             <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
                <h2 style="color: #10b981;">Execution Proposal Accepted</h2>
                <p>Congratulations! Your technical architecture and pricing bid for <strong>${acceptedBid.project.title}</strong> was formally accepted.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
                   <p style="color: #475569; font-size: 14px;">The client is currently funding the Escrow layout. We will notify you once capital is locked securely via Stripe natively and you are cleared to build.</p>
                </div>
                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Execution Network</p>
             </div>
           `
         });
       } catch(e) {
         console.error("Resend Winner Trigger Warning:", e);
       }
    }

    // Fire rejecting alerts securely across background execution mapping loop
    Promise.all(rejectedBids.filter(b => b.developer?.email).map(b => 
       resend.emails.send({
           from: "Untether Marketplace <marketplace@untether.network>",
           to: b.developer.email as string,
           subject: `Update on Project: ${acceptedBid?.project.title}`,
           html: `
             <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
                <h2 style="color: #6366f1;">Marketplace Execution Update</h2>
                <p>Update on <strong>${acceptedBid?.project.title}</strong>: The client has decided to vigorously move forward with another developer securely resolving this Escrow node.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
                   <p style="color: #475569; font-size: 14px;">Keep analyzing logic boundaries and placing constraint bids across the active Marketplace board natively!</p>
                </div>
             </div>
           `
       })
    )).catch(e => console.error("Resend Rejection Looping Fault:", e));

    revalidatePath(`/projects/${projectId}`);
    return { success: true, projectId };

  } catch (err: any) {
    console.error("Critical Binding Fault:", err);
    return { success: false, error: err.message };
  }
}
