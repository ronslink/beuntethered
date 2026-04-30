import { Resend } from 'resend';
import { buildAppUrl } from "./app-url.ts";
import { getEmailConfiguration, getResendApiKey } from "./email-config.ts";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type EmailInput = {
  from?: string;
  to: string;
  subject: string;
  html: string;
};

export async function sendTransactionalEmail({
  from,
  to,
  subject,
  html,
}: EmailInput) {
  const config = getEmailConfiguration();
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return { sent: false, skipped: "RESEND_API_KEY_MISSING" as const };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({ from: from ?? config.defaultFrom, to, subject, html });
  return { sent: true as const };
}

export async function sendEscrowFundedAlert(expertEmail: string, projectTitle: string, amount: number) {
  try {
    await sendTransactionalEmail({
      from: "Untether Escrow <escrow@untether.network>",
      to: expertEmail,
      subject: `[ACTION REQUIRED] Escrow Funded: ${projectTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #6366f1;">Sprint Escrow Locked</h2>
          <p>The client has funded the next milestone.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <h3 style="margin-top:0;">${escapeHtml(projectTitle)}</h3>
            <p style="color: #475569; font-size: 16px; font-weight: bold;">Funded amount: $${amount.toFixed(2)}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">You can begin work from the Command Center.</p>
          <a href="${buildAppUrl("/dashboard")}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Access Command Center</a>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (Escrow Funded):", error);
  }
}

export async function sendSavedSearchAlert({
  to,
  name,
  searchName,
  matchCount,
  projects,
  marketplaceUrl,
}: {
  to: string;
  name: string;
  searchName: string;
  matchCount: number;
  projects: { title: string; totalValue: number; bidCount: number }[];
  marketplaceUrl: string;
}) {
  const projectRows = projects.map((project) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <div style="font-weight: 700; color: #111827;">${escapeHtml(project.title)}</div>
        <div style="font-size: 13px; color: #64748b;">$${project.totalValue.toLocaleString()} total scope · ${project.bidCount} bid${project.bidCount === 1 ? "" : "s"}</div>
      </td>
    </tr>
  `).join("");

  try {
    return await sendTransactionalEmail({
      from: "Untether Alerts <alerts@untether.network>",
      to,
      subject: `${matchCount} new Untether project${matchCount === 1 ? "" : "s"} for ${searchName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #334155;">New Matching Projects</h2>
          <p>Hi ${escapeHtml(name)}, your saved search <strong>${escapeHtml(searchName)}</strong> has ${matchCount} new matching project${matchCount === 1 ? "" : "s"}.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            ${projectRows}
          </table>
          <a href="${marketplaceUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700;">Review Matches</a>
          <p style="margin-top: 28px; font-size: 12px; color: #94a3b8;">You are receiving this because saved search alerts are enabled in Untether.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Resend alert failed (Saved Search):", error);
    return { sent: false, skipped: "RESEND_SEND_FAILED" as const };
  }
}

export async function sendBYOCInvite(clientEmail: string, projectTitle: string, token: string) {
  try {
    return await sendTransactionalEmail({
      from: "Untether Escrow <escrow@untether.network>",
      to: clientEmail,
      subject: `[ACTION REQUIRED] Secure Statement of Work: ${projectTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #6366f1;">Secure Escrow Initialization</h2>
          <p>Your expert facilitator has prepared a secure Statement of Work for you on Untether.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
            <h3 style="margin-top:0;">${escapeHtml(projectTitle)}</h3>
            <p style="color: #475569; font-size: 14px;">Review exactly how the AI Auditor will evaluate the final code architecture before Escrow resolves.</p>
          </div>
          <a href="${buildAppUrl(`/invite/${token}`)}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review Scope & Fund Escrow</a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Secure Payment Network</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (BYOC Invite):", error);
    return { sent: false, skipped: "RESEND_SEND_FAILED" as const };
  }
}

export async function sendSprintGateReview(clientEmail: string, projectTitle: string, hours: number) {
  try {
    await sendTransactionalEmail({
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
          <a href="${buildAppUrl("/dashboard")}" style="display: inline-block; background-color: #0d9488; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review Technical Layouts</a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Autonomy Module</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Resend Alert Failed (Sprint Review):", error);
  }
}

export async function sendNewBidAlert({
  clientEmail,
  projectId,
  projectTitle,
}: {
  clientEmail: string;
  projectId: string;
  projectTitle: string;
}) {
  return sendTransactionalEmail({
    from: "Untether Marketplace <marketplace@untether.network>",
    to: clientEmail,
    subject: `New bid on "${projectTitle}"`,
    html: `<p>A facilitator submitted a proposal for <strong>${escapeHtml(projectTitle)}</strong>. <a href="${buildAppUrl(`/projects/${projectId}`)}">Review it here</a>.</p>`,
  });
}

export async function sendBidCounterAlert({
  facilitatorEmail,
  projectTitle,
  counterAmount,
}: {
  facilitatorEmail: string;
  projectTitle: string;
  counterAmount: number;
}) {
  return sendTransactionalEmail({
    from: "Untether Marketplace <marketplace@untether.network>",
    to: facilitatorEmail,
    subject: `Counter offer on "${projectTitle}"`,
    html: `<p>The client has countered your proposal for <strong>${escapeHtml(projectTitle)}</strong> at $${counterAmount.toLocaleString()}. <a href="${buildAppUrl("/marketplace")}">View it here</a>.</p>`,
  });
}

export async function sendBidAcceptedAlert({
  facilitatorEmail,
  projectId,
  projectTitle,
}: {
  facilitatorEmail: string;
  projectId: string;
  projectTitle: string;
}) {
  return sendTransactionalEmail({
    from: "Untether Marketplace <marketplace@untether.network>",
    to: facilitatorEmail,
    subject: `Your bid was accepted: "${projectTitle}"`,
    html: `<p>Your proposal for <strong>${escapeHtml(projectTitle)}</strong> was accepted. The client can now fund escrow. <a href="${buildAppUrl(`/command-center/${projectId}`)}">View the active project</a>.</p>`,
  });
}

export async function sendDisputeOpenedAlert({
  counterpartyEmail,
  projectId,
  projectTitle,
  milestoneTitle,
  openedByRole,
  reason,
}: {
  counterpartyEmail: string;
  projectId: string;
  projectTitle: string;
  milestoneTitle: string;
  openedByRole: "CLIENT" | "FACILITATOR";
  reason: string;
}) {
  try {
    return await sendTransactionalEmail({
      from: "Untether Trust <trust@untether.network>",
      to: counterpartyEmail,
      subject: `Dispute opened on "${projectTitle}"`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #b91c1c;">Dispute Opened</h2>
          <p>A ${openedByRole === "CLIENT" ? "client" : "facilitator"} opened a dispute on <strong>${escapeHtml(projectTitle)}</strong>.</p>
          <div style="background: #fef2f2; padding: 18px; border-radius: 12px; border: 1px solid #fecaca; margin: 22px 0;">
            <div style="font-size: 12px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;">Milestone</div>
            <div style="font-weight: 800; margin-top: 4px;">${escapeHtml(milestoneTitle)}</div>
            <p style="color: #7f1d1d; font-size: 14px; line-height: 1.5;">${escapeHtml(reason)}</p>
          </div>
          <p style="color: #475569; font-size: 14px;">Review the case, evidence package, and AI fact-finding status in the command center.</p>
          <a href="${buildAppUrl(`/command-center/${projectId}`)}" style="display: inline-block; background-color: #dc2626; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700;">Open Dispute Case</a>
        </div>
      `,
    });
  } catch (error) {
    console.error("Resend alert failed (Dispute Opened):", error);
    return { sent: false, skipped: "RESEND_SEND_FAILED" as const };
  }
}

export async function sendBYOCProjectReadyAlert({
  clientEmail,
  projectId,
  projectTitle,
  summary,
}: {
  clientEmail: string;
  projectId: string;
  projectTitle: string;
  summary: string;
}) {
  return sendTransactionalEmail({
    from: "Untether Escrow <escrow@untether.network>",
    to: clientEmail,
    subject: `[ACTION REQUIRED] Secure Statement of Work: ${projectTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #6366f1;">Secure Escrow Initialization</h2>
        <p>Your expert facilitator has prepared a secure Statement of Work for you on Untether.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0;">
          <h3 style="margin-top:0;">${escapeHtml(projectTitle)}</h3>
          <p style="color: #475569; font-size: 14px;">${escapeHtml(summary)}</p>
        </div>
        <a href="${buildAppUrl(`/projects/${projectId}`)}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Review and Fund Escrow</a>
        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">Untether Secure Payment Network</p>
      </div>
    `,
  });
}
