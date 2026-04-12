"use server";

import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createProjectFromSoW({
  sowData,
  clientEmail
}: {
  sowData: any;
  clientEmail: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "FACILITATOR") throw new Error("Unauthorized to perform this sequence. Only facilitators can scaffold BYOC structures.");

    // Rate limit: prevent the same facilitator from creating more than 5 BYOC clients per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentBYOCCount = await prisma.project.count({
      where: {
        creator_id: user.id,
        is_byoc: true,
        created_at: { gte: oneDayAgo }
      }
    });
    if (recentBYOCCount >= 5) {
      throw new Error("Rate limit exceeded: maximum 5 BYOC clients per day.");
    }

    // 1. Verify client exists and is a CLIENT — reject if fabricated
    const client = await prisma.user.findUnique({ where: { email: clientEmail } });
    if (!client) {
      throw new Error("Client does not exist. Please ensure the client has registered on the platform.");
    }
    if (client.role !== "CLIENT") {
      throw new Error("The provided email belongs to a non-CLIENT user. Only registered clients can be assigned to BYOC projects.");
    }

    // 2. Transmute AI JSON heavily into Prisma Escrow objects flawlessly
    const project = await prisma.project.create({
      data: {
        title: sowData.title,
        ai_generated_sow: sowData.executiveSummary,
        is_byoc: true, // Auto-locked to True denoting Facilitator originate
        status: "DRAFT",
        creator_id: user.id,
        client_id: client.id,
        milestones: {
          create: sowData.milestones.map((m: any) => ({
            title: m.title,
            amount: m.amount,
            status: "PENDING",
            facilitator_id: user.id
          }))
        },
        messages: {
          create: {
            content: `BYOC client verified: ${client.name ?? clientEmail} (${clientEmail}). Project created by facilitator ${user.name ?? user.email}.`,
            is_system_message: true,
            sender_id: null
          }
        }
      }
    });

    // Force Next.js to reconstruct the Dashboard mapping updating global views
    revalidatePath("/dashboard");

    try {
      await resend.emails.send({
        from: "Untether Escrow <escrow@untether.network>",
        to: clientEmail,
        subject: `[ACTION REQUIRED] Secure Statement of Work: ${sowData.title}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="color: #6366f1;">Secure Escrow Initialization</h2>
            <p>Your expert facilitator has prepared a secure Statement of Work for you on Untether.</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
              <h3 style="margin-top:0;">${sowData.title}</h3>
              <p style="color: #475569; font-size: 14px;">${sowData.executiveSummary}</p>
            </div>
            <a href="${process.env.NEXTAUTH_URL}/projects/${project.id}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review and Fund Escrow</a>
            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Secure Payment Network</p>
          </div>
        `
      });
    } catch (e) {
      console.error("Resend Trigger Warning: Output failure against standard boundaries", e);
    }

    return { success: true, projectId: project.id };

  } catch (error: any) {
    console.error("Critical Server Action Fault:", error);
    return { success: false, error: error.message };
  }
}

export async function closeProject({
  projectId,
  facilitatorId,
  rating,
  feedback
}: {
  projectId: string;
  facilitatorId: string;
  rating: number;
  feedback: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "CLIENT") throw new Error("Unauthorized Access Network");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { milestones: true }
    });

    if (!project || project.client_id !== user.id) throw new Error("Invalid Auth Loop.");

    const uncompletedMilestones = project.milestones.filter(m => m.status !== "APPROVED_AND_PAID" && m.status !== "DISPUTED");
    if (project.billing_type === "FIXED_MILESTONE" && uncompletedMilestones.length > 0) {
       throw new Error("Cannot close Escrow until all execution phases are approved & paid.");
    }

    await prisma.review.create({
       data: {
          project_id: projectId,
          client_id: user.id,
          facilitator_id: facilitatorId,
          rating,
          feedback
       }
    });

    await prisma.project.update({
       where: { id: projectId },
       data: { status: "COMPLETED" }
    });

    const allExpertTimeEntries = await prisma.timeEntry.findMany({
       where: { facilitator_id: facilitatorId }
    });

    let totalAlignmentScore = 0;
    let totalAudits = 0;

    allExpertTimeEntries.forEach(entry => {
       if (entry.ai_audit_report) {
          const report = entry.ai_audit_report as any;
          if (report.alignment_score) {
             totalAlignmentScore += Number(report.alignment_score);
             totalAudits += 1;
          }
       }
    });

    const average_ai_audit_score = totalAudits > 0 ? (totalAlignmentScore / totalAudits) : 100; // Default to 100 if no audits

    const allReviews = await prisma.review.findMany({
       where: { facilitator_id: facilitatorId }
    });
    
    const avgRating = allReviews.length > 0
       ? allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length
       : rating;

    const trust_score = (average_ai_audit_score * 0.7) + ((avgRating / 5 * 100) * 0.3);

    await prisma.user.update({
       where: { id: facilitatorId },
       data: {
          average_ai_audit_score,
          trust_score,
          total_sprints_completed: { increment: 1 }
       }
    });

    revalidatePath(`/command-center`);
    revalidatePath(`/facilitators/${facilitatorId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Critical Escrow Closure Fault:", error);
    return { success: false, error: error.message };
  }
}

