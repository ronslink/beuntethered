import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("client can invite a facilitator and facilitator can accept", async ({ page }) => {
  const prefix = `playwright-invite-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-invite-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Playwright Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Playwright Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Playwright Invite Project",
      ai_generated_sow: "Build a verified internal operations dashboard with authentication, reporting, and milestone evidence.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Operational dashboard MVP",
          amount: 5000,
          description: "Dashboard shell and reporting workflow.",
          acceptance_criteria: ["Client can access dashboard", "Report data renders"],
          deliverables: ["Staging URL", "Source archive"],
          estimated_duration_days: 14,
        },
      },
    },
  });

  try {
    await signInAs(page, clientEmail);

    await page.goto("/talent");
    await page.getByPlaceholder(/search skills/i).fill("Playwright Facilitator");
    await expect(page.getByText("Playwright Facilitator").first()).toBeVisible();
    await page.getByRole("button", { name: /invite/i }).first().click();
    await expect(page.getByRole("heading", { name: "Playwright Facilitator", level: 3 })).toBeVisible();
    await page.getByRole("button", { name: /send invite/i }).click();
    await expect(page.getByText(/invite sent/i)).toBeVisible();

    await expect
      .poll(async () => prisma.projectInvite.count({
        where: {
          project_id: project.id,
          facilitator_id: facilitator.id,
          status: "SENT",
        },
      }))
      .toBe(1);

    await page.getByRole("button", { name: /^close$/i }).click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await signInAs(page, facilitatorEmail);

    await page.goto(`/marketplace/project/${project.id}`);
    await expect(page.getByText("Invited opportunity")).toBeVisible();
    await expect(page.getByText(/status: viewed/i)).toBeVisible();
    await expect
      .poll(async () => prisma.projectInvite.count({
        where: {
          project_id: project.id,
          facilitator_id: facilitator.id,
          status: "VIEWED",
        },
      }))
      .toBe(1);
    await expect
      .poll(async () => prisma.activityLog.count({
        where: {
          project_id: project.id,
          entity_type: "ProjectInvite",
          metadata: { path: ["operation"], equals: "INVITE_VIEWED" },
        },
      }))
      .toBe(1);

    await page.goto("/marketplace?search=Playwright%20Invite");
    await expect(page.getByText("Invited Opportunity")).toBeVisible();
    await expect(page.getByText(/proof required/i)).toBeVisible();
    await expect(page.getByText(/working preview url/i)).toBeVisible();
    await page.getByRole("button", { name: /^accept$/i }).click();
    await expect(page.getByText(/status: accepted/i)).toBeVisible();

    await expect
      .poll(async () => prisma.projectInvite.count({
        where: {
          project_id: project.id,
          facilitator_id: facilitator.id,
          status: "ACCEPTED",
        },
      }))
      .toBe(1);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("submitting a proposal accepts a viewed invite automatically", async ({ page }) => {
  const prefix = `playwright-invite-submit-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;

  await cleanupByEmailPrefix("playwright-invite-submit-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Invite Submit Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Invite Submit Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: "Proposal Auto Accept Invite",
      ai_generated_sow: "Build a verified analytics dashboard with evidence-backed milestone acceptance.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Analytics dashboard preview",
          amount: 2500,
          description: "Dashboard preview and evidence package.",
          acceptance_criteria: ["Working preview URL is available", "Acceptance checklist is complete"],
          deliverables: ["Working preview URL", "Repository branch"],
          estimated_duration_days: 7,
        },
      },
    },
  });

  await prisma.projectInvite.create({
    data: {
      project_id: project.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "SENT",
      message: "Please propose a verified dashboard delivery plan.",
    },
  });

  try {
    await signInAs(page, facilitatorEmail);
    await page.goto(`/marketplace/project/${project.id}`);
    await expect(page.getByText(/status: viewed/i)).toBeVisible();

    await page.getByRole("button", { name: /submit proposal/i }).click();
    await page.getByRole("button", { name: /quick bid/i }).click();
    await page.getByPlaceholder("Enter your quote").fill("2400");
    await page.getByPlaceholder("Enter days").fill("6");
    await page
      .getByPlaceholder("Describe your approach, tools, and how you will build this...")
      .fill("I will deliver the dashboard with a working preview URL, repository evidence, and acceptance checklist mapped to the milestone.");
    await page.getByRole("button", { name: /^submit bid/i }).click();
    await expect(page.getByRole("heading", { name: "Proposal Submitted" })).toBeVisible();

    await expect
      .poll(async () => prisma.projectInvite.count({
        where: {
          project_id: project.id,
          facilitator_id: facilitator.id,
          status: "ACCEPTED",
        },
      }))
      .toBe(1);
    await expect
      .poll(async () => prisma.activityLog.count({
        where: {
          project_id: project.id,
          entity_type: "ProjectInvite",
          metadata: { path: ["operation"], equals: "INVITE_ACCEPTED_BY_PROPOSAL" },
        },
      }))
      .toBe(1);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("declined invites do not remain in invited marketplace work", async ({ page }) => {
  const prefix = `playwright-invite-declined-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const projectTitle = `Declined Invite Marketplace ${Date.now()}`;

  await cleanupByEmailPrefix("playwright-invite-declined-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Declined Invite Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Declined Invite Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: projectTitle,
      ai_generated_sow: "Build a verified reporting workflow with milestone evidence and audit-ready delivery proof.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Reporting workflow evidence pack",
          amount: 1800,
          description: "Reporting workflow preview and acceptance evidence.",
          acceptance_criteria: ["Working preview URL is available", "Acceptance evidence is attached"],
          deliverables: ["Working preview URL", "Acceptance checklist"],
          estimated_duration_days: 5,
        },
      },
    },
  });

  await prisma.projectInvite.create({
    data: {
      project_id: project.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "DECLINED",
      message: "This invite was declined and should no longer be treated as active invited work.",
      viewed_at: new Date(),
      responded_at: new Date(),
    },
  });

  try {
    await signInAs(page, facilitatorEmail);
    await page.goto(`/marketplace?search=${encodeURIComponent(projectTitle)}`);

    await expect(page.getByRole("heading", { name: projectTitle }).first()).toBeVisible();
    await expect(page.getByText("Invited Opportunities")).toHaveCount(0);
    await expect(page.getByText("Open Marketplace")).toBeVisible();
    await expect(page.getByText("Invited", { exact: true })).toHaveCount(0);
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("client reinvite after decline resets invite view state", async ({ page }) => {
  const prefix = `playwright-invite-reinvite-${Date.now()}`;
  const clientEmail = `${prefix}-client@example.com`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const projectTitle = `Reinvite Reset Project ${Date.now()}`;

  await cleanupByEmailPrefix("playwright-invite-reinvite-");
  const client = await seedUser({ email: clientEmail, role: "CLIENT", name: "Reinvite Buyer" });
  const facilitator = await seedUser({ email: facilitatorEmail, role: "FACILITATOR", name: "Reinvite Facilitator" });

  const project = await prisma.project.create({
    data: {
      creator_id: client.id,
      client_id: client.id,
      title: projectTitle,
      ai_generated_sow: "Build a verified internal workflow with delivery artifacts and acceptance evidence.",
      status: "OPEN_BIDDING",
      milestones: {
        create: {
          title: "Workflow proof package",
          amount: 2200,
          description: "Working workflow preview and proof package.",
          acceptance_criteria: ["Working preview URL is available", "Proof package maps to the workflow"],
          deliverables: ["Preview URL", "Proof package"],
          estimated_duration_days: 6,
        },
      },
    },
  });

  const declinedAt = new Date(Date.now() - 60_000);
  const invite = await prisma.projectInvite.create({
    data: {
      project_id: project.id,
      inviter_id: client.id,
      facilitator_id: facilitator.id,
      status: "DECLINED",
      message: "Original invite was declined.",
      viewed_at: declinedAt,
      responded_at: declinedAt,
    },
  });

  try {
    await signInAs(page, clientEmail);
    await page.goto("/talent");
    await page.getByPlaceholder(/search skills/i).fill("Reinvite Facilitator");
    await expect(page.getByText("Reinvite Facilitator").first()).toBeVisible();
    await page.getByRole("button", { name: /reinvite/i }).first().click();
    await expect(page.getByRole("heading", { name: "Reinvite Facilitator", level: 3 })).toBeVisible();
    await page.getByRole("button", { name: /send invite/i }).click();
    await expect(page.getByText(/invite sent/i)).toBeVisible();

    await expect
      .poll(async () => prisma.projectInvite.findUnique({
        where: { id: invite.id },
        select: { status: true, viewed_at: true, responded_at: true },
      }))
      .toEqual({ status: "SENT", viewed_at: null, responded_at: null });
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});
