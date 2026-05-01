import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedFacilitatorVerifications, seedUser } from "./support/db";

test("client sees enterprise bid comparison evidence", async ({ page }) => {
  const prefix = `playwright-bids-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-bids-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Bid Board Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Evidence Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Bid Review Evidence Project",
      ai_generated_sow: "Build a secure vendor portal with verified milestone delivery and audit-ready release reporting.",
      status: "OPEN_BIDDING",
      milestones: {
        create: [
          {
            title: "Portal foundation",
            amount: 4000,
            description: "Authentication, shell, and project data model.",
            acceptance_criteria: ["Client can sign in", "Vendor table renders"],
            deliverables: ["Staging URL"],
            estimated_duration_days: 8,
          },
          {
            title: "Audit reporting",
            amount: 3000,
            description: "Milestone release report and audit summary.",
            acceptance_criteria: ["Audit score appears", "Release summary renders"],
            deliverables: ["Report page"],
            estimated_duration_days: 6,
          },
        ],
      },
      bids: {
        create: {
          developer_id: facilitator.id,
          proposed_amount: 6800,
          estimated_days: 12,
          technical_approach: "Use Next.js, Prisma, and Stripe to ship a controlled milestone workflow with evidence capture.",
          proposed_tech_stack: "Next.js, TypeScript, Prisma, Stripe",
          tech_stack_reason: "Matches the requested secure portal and payment release workflow.",
          proposed_milestones: [
            { title: "Portal foundation", amount: 3800, days: 7, description: "Core authenticated portal." },
            { title: "Audit reporting", amount: 3000, days: 5, description: "Audit-backed delivery report." },
          ],
          required_escrow_pct: 75,
          ai_translation_summary: "Strong fit for verified milestone delivery.",
          ai_score_card: {
            recommendation: "TOP_PICK",
            stack_compatibility: 94,
            price: { signal: "FAIR" },
            timeline: { signal: "REALISTIC" },
            flags: [],
          },
        },
      },
    },
    include: { bids: { select: { id: true } } },
  });
  const bid = project.bids[0];

  await prisma.projectEvidenceSource.create({
    data: {
      project_id: project.id,
      created_by_id: facilitator.id,
      type: "VERCEL",
      label: "Staging preview",
      url: "https://vendor-portal-preview.vercel.app",
      status: "CONNECTED",
      metadata: {
        verification_note: "Maps to the portal foundation milestone and proves the staging release.",
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      project_id: project.id,
      actor_id: client.id,
      bid_id: bid.id,
      action: "BID_SHORTLISTED",
      entity_type: "BID",
      entity_id: bid.id,
      metadata: {
        actor_project_role: "OWNER",
        actor_scope: "PROJECT_OWNER",
        workspace_admin_action: false,
      },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText("Bid Review Evidence Project").first()).toBeVisible();
    await expect(page.getByText("AI Comparative Analysis")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "AI Evidence" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Proof" })).toBeVisible();
    await expect(page.getByText("Evidence Facilitator").first()).toBeVisible();
    await expect(page.getByText("Top Pick").first()).toBeVisible();
    await expect(page.getByText("Proof Confidence").first()).toBeVisible();
    await expect(page.getByText("Provider-backed proof").first()).toBeVisible();
    await expect(page.getByText("Vercel").first()).toBeVisible();
    await expect(page.getByText("Award Gate Checklist").first()).toBeVisible();
    await expect(page.getByText("4/5 ready").first()).toBeVisible();
    await expect(page.getByText("Facilitator verified").first()).toBeVisible();
    await expect(page.getByText("75%").first()).toBeVisible();
    await expect(page.getByText("$7,000").first()).toBeVisible();
    await expect(page.getByText("$6,800").first()).toBeVisible();
    await expect(page.getByText("The facilitator must connect Stripe Express before this proposal can be accepted.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^check Accept$/ })).toBeDisabled();
    await expect(page.getByText("Decision Audit Trail")).toBeVisible();
    await expect(page.getByText("Bid shortlisted")).toBeVisible();
    await expect(page.getByText("Bid Board Buyer - Project owner")).toBeVisible();
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("client accepting a verified proposal awards only one bid", async ({ page }) => {
  const prefix = `playwright-bid-award-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const firstFacilitatorEmail = `${prefix}-facilitator-a@example.com`;
  const secondFacilitatorEmail = `${prefix}-facilitator-b@example.com`;

  await cleanupByEmailPrefix("playwright-bid-award-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Award Buyer" });
  const firstFacilitator = await seedUser({ email: firstFacilitatorEmail, role: "FACILITATOR", name: "Verified Award Facilitator" });
  const secondFacilitator = await seedUser({ email: secondFacilitatorEmail, role: "FACILITATOR", name: "Backup Award Facilitator" });

  await prisma.user.update({
    where: { id: firstFacilitator.id },
    data: { stripe_account_id: "acct_playwright_verified_award" },
  });
  await seedFacilitatorVerifications({ userId: firstFacilitator.id, provider: "playwright-award" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Verified Proposal Award Project",
      ai_generated_sow: "Build a verified release dashboard with evidence capture and escrow-backed milestones.",
      status: "OPEN_BIDDING",
      milestones: {
        create: [
          {
            title: "Release dashboard",
            amount: 3000,
            description: "Dashboard with release status and evidence checklist.",
            acceptance_criteria: ["Client can open the dashboard", "Evidence checklist is visible"],
            deliverables: ["Staging URL", "Evidence checklist"],
            estimated_duration_days: 6,
          },
        ],
      },
      bids: {
        create: [
          {
            developer_id: firstFacilitator.id,
            proposed_amount: 3000,
            estimated_days: 6,
            technical_approach: "I will deliver a staging dashboard with evidence mapped to each acceptance check.",
            proposed_tech_stack: "Next.js, Prisma",
            tech_stack_reason: "Matches the verified release dashboard workflow.",
            proposed_milestones: [
              {
                title: "Release dashboard proof",
                amount: 3000,
                days: 6,
                description: "Dashboard with release state, evidence checklist, and review-ready proof.",
                deliverables: ["Staging URL", "Evidence checklist"],
                acceptance_criteria: ["Client can open the dashboard", "Evidence checklist is visible"],
              },
            ],
            required_escrow_pct: 100,
            ai_translation_summary: "Verified facilitator with clear proof plan.",
            ai_score_card: {
              recommendation: "TOP_PICK",
              stack_compatibility: 92,
              price: { signal: "FAIR" },
              timeline: { signal: "REALISTIC" },
              flags: [],
            },
          },
          {
            developer_id: secondFacilitator.id,
            proposed_amount: 2800,
            estimated_days: 8,
            technical_approach: "I can build the dashboard, but evidence details will be refined later.",
            required_escrow_pct: 100,
            ai_translation_summary: "Needs more proof detail.",
            ai_score_card: {
              recommendation: "REVIEW",
              stack_compatibility: 78,
              price: { signal: "FAIR" },
              timeline: { signal: "REALISTIC" },
              flags: ["Proof details need review."],
            },
          },
        ],
      },
    },
    include: { bids: { select: { id: true, developer_id: true } } },
  });
  const acceptedBid = project.bids.find((bid) => bid.developer_id === firstFacilitator.id)!;
  const rejectedBid = project.bids.find((bid) => bid.developer_id === secondFacilitator.id)!;

  try {
    await signInAs(page, clientEmail);
    await page.goto(`/projects/${project.id}`);

    await expect(page.getByText("Verified Proposal Award Project").first()).toBeVisible();
    await expect(page.getByText("5/5 ready").first()).toBeVisible();
    await page.getByRole("button", { name: /^check Accept$/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/command-center/${project.id}`));

    await expect
      .poll(async () => prisma.project.findUnique({
        where: { id: project.id },
        select: { status: true, active_bid_id: true },
      }))
      .toEqual({ status: "ACTIVE", active_bid_id: null });
    await expect
      .poll(async () => prisma.bid.findUnique({ where: { id: acceptedBid.id }, select: { status: true } }))
      .toEqual({ status: "ACCEPTED" });
    await expect
      .poll(async () => prisma.bid.findUnique({ where: { id: rejectedBid.id }, select: { status: true } }))
      .toEqual({ status: "REJECTED" });
    await expect
      .poll(async () => prisma.milestone.findFirst({
        where: { project_id: project.id, facilitator_id: firstFacilitator.id },
        select: { title: true, deliverables: true, acceptance_criteria: true },
      }))
      .toEqual({
        title: "Release dashboard proof",
        deliverables: ["Staging URL", "Evidence checklist"],
        acceptance_criteria: ["Client can open the dashboard", "Evidence checklist is visible"],
      });
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
