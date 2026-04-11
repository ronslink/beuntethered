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
    if (!user || user.role !== "DEVELOPER") throw new Error("Unauthorized to perform this sequence. Only developers can scaffold BYOC structures.");

    // 1. Establish strict client routing. Mock creation if non-existent for test flows.
    let client = await prisma.user.findUnique({ where: { email: clientEmail } });
    if (!client) {
      client = await prisma.user.create({
        data: {
          email: clientEmail,
          role: "CLIENT",
          name: clientEmail.split('@')[0],
        }
      });
    }

    // 2. Transmute AI JSON heavily into Prisma Escrow objects flawlessly
    const project = await prisma.project.create({
      data: {
        title: sowData.title,
        ai_generated_sow: sowData.executiveSummary,
        is_byoc: true, // Auto-locked to True denoting Developer originate
        status: "DRAFT",
        developer_id: user.id,
        client_id: client.id,
        milestones: {
          create: sowData.milestones.map((m: any) => ({
            title: m.title,
            amount: m.amount,
            status: "PENDING"
          }))
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
            <p>Your expert developer has prepared a secure Statement of Work for you on Untether.</p>
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
