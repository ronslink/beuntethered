import { Resend } from 'resend';

// Use a fallback to prevent build crashes if the key isn't set yet natively
export const resend = new Resend(process.env.RESEND_API_KEY || "missing-key");

export async function sendEscrowFundedAlert(expertEmail: string, projectTitle: string, amount: number) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: "Untether Escrow <escrow@untether.network>",
      to: expertEmail,
      subject: `[ACTION REQUIRED] Escrow Funded: ${projectTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #6366f1;">Sprint Escrow Locked</h2>
          <p>The client has successfully funded the project limitations natively.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <h3 style="margin-top:0;">${projectTitle}</h3>
            <p style="color: #475569; font-size: 16px; font-weight: bold;">Available Execution Drawdown: $${amount.toFixed(2)}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">You are mathematically mathematically cleared to begin work inside the Command Center constraints.</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Access Command Center</a>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (Escrow Funded):", error);
  }
}

export async function sendBYOCInvite(clientEmail: string, projectTitle: string, token: string) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: "Untether Escrow <escrow@untether.network>",
      to: clientEmail,
      subject: `[ACTION REQUIRED] Secure Statement of Work: ${projectTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #6366f1;">Secure Escrow Initialization</h2>
          <p>Your expert facilitator has prepared a secure Statement of Work for you on Untether.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <h3 style="margin-top:0;">${projectTitle}</h3>
            <p style="color: #475569; font-size: 14px;">Review exactly how the AI Auditor will evaluate the final code architecture before Escrow resolves.</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/lobby/${token}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review Scope & Fund Execute</a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Secure Payment Network</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (BYOC Invite):", error);
  }
}

export async function sendSprintGateReview(clientEmail: string, projectTitle: string, hours: number) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: "Untether Escrow <escrow@untether.network>",
      to: clientEmail,
      subject: `[ACTION REQUIRED] AI Audit Ready for: ${projectTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #0d9488;">Expert Execution Logged</h2>
          <p>The Facilitator has successfully submitted ${hours} hours of sprint execution for your review.</p>
          <div style="background: #f0fdfa; padding: 20px; border-radius: 12px; border: 1px solid #ccfbf1; margin: 24px 0;">
            <h3 style="margin-top:0; color: #0f766e;">Run Immediate Verification</h3>
            <p style="color: #0f766e; font-size: 14px;">The AI Auditor has evaluated the raw Codebase strictly mapping alignment logic against your original SOW arrays.</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background-color: #0d9488; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review Technical Layouts</a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Autonomy Module</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (Sprint Review):", error);
  }
}
