import { expect, test } from "@playwright/test";
import { signInAs } from "./support/auth";
import { cleanupByEmailPrefix, prisma, seedUser } from "./support/db";

test("BYOC invite page blocks signed-in clients using the wrong invited email", async ({ page }) => {
  const prefix = `playwright-byoc-invite-guard-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const invitedClientEmail = `${prefix}-invited@example.com`;
  const wrongClientEmail = `${prefix}-wrong@example.com`;
  const inviteToken = `playwright-byoc-guard-${Date.now()}`;

  await cleanupByEmailPrefix("playwright-byoc-invite-guard-");
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "BYOC Guard Facilitator",
  });
  await seedUser({
    email: wrongClientEmail,
    role: "CLIENT",
    name: "Wrong Client",
  });

  await prisma.project.create({
    data: {
      creator_id: facilitator.id,
      title: "Private Analytics Console",
      ai_generated_sow:
        "Build a private analytics console with verifiable staging access, event evidence, and milestone acceptance checks.",
      is_byoc: true,
      invite_token: inviteToken,
      invited_client_email: invitedClientEmail,
      status: "DRAFT",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Analytics console delivery",
          amount: 3200,
          estimated_duration_days: 7,
          description: "Deliver the analytics console with staging evidence and buyer review checklist.",
          deliverables: ["Staging URL", "Repository branch", "Evidence checklist"],
          acceptance_criteria: ["Buyer can access staging", "Checklist maps each feature to evidence"],
        },
      },
    },
  });

  try {
    await signInAs(page, wrongClientEmail);
    await page.goto(`/invite/${inviteToken}`);

    await expect(page.getByRole("heading", { name: /review your verified delivery scope/i })).toBeVisible();
    await expect(page.getByText("Invite email mismatch")).toBeVisible();
    await expect(page.getByText("Private claim guard")).toBeVisible();
    await expect(page.getByRole("link", { name: /review account/i })).toHaveAttribute(
      "href",
      "/dashboard?invite_error=wrong_client_email"
    );
  } finally {
    await cleanupByEmailPrefix(prefix);
  }
});

test("BYOC invite claim atomically assigns the buyer workspace once", async ({ page }) => {
  const prefix = `playwright-byoc-claim-once-${Date.now()}`;
  const facilitatorEmail = `${prefix}-facilitator@example.com`;
  const clientEmail = `${prefix}-client@example.com`;
  const inviteToken = `playwright-byoc-claim-${Date.now()}`;
  let organizationId: string | null = null;

  await cleanupByEmailPrefix("playwright-byoc-claim-once-");
  const facilitator = await seedUser({
    email: facilitatorEmail,
    role: "FACILITATOR",
    name: "BYOC Claim Facilitator",
  });
  const client = await seedUser({
    email: clientEmail,
    role: "CLIENT",
    name: "BYOC Claim Buyer",
  });
  const organization = await prisma.organization.create({
    data: {
      owner_id: client.id,
      name: "BYOC Claim Workspace",
      type: "SMB",
      billing_email: clientEmail,
      members: {
        create: {
          user_id: client.id,
          role: "OWNER",
        },
      },
    },
  });
  organizationId = organization.id;

  const project = await prisma.project.create({
    data: {
      creator_id: facilitator.id,
      title: "Private Operations Repair",
      ai_generated_sow:
        [
          "Private BYOC Scope: Private Operations Repair",
          "",
          "BYOC Transition Baseline",
          "Transition mode: running project",
          "Current project state: Client has a partially working operations console in staging.",
          "Prior work or existing assets: Existing repository, staging URL, and production incident notes.",
          "Remaining work to govern in Untether: Stabilize the console, verify the repair, and provide release evidence.",
          "Known risks or open questions: Production credentials are not yet available.",
          "Platform responsibility starts from the accepted packet and funded milestones onward.",
        ].join("\n"),
      is_byoc: true,
      invite_token: inviteToken,
      invited_client_email: clientEmail,
      status: "DRAFT",
      milestones: {
        create: {
          facilitator_id: facilitator.id,
          title: "Operations repair handoff",
          amount: 2800,
          estimated_duration_days: 6,
          description: "Deliver a working repair package with staging evidence and buyer acceptance checklist.",
          deliverables: ["Staging URL", "Repository branch", "Evidence checklist"],
          acceptance_criteria: ["Buyer can access staging", "Checklist maps each feature to evidence"],
        },
      },
    },
  });

  try {
    await signInAs(page, clientEmail);
    const authCookie = (await page.context().cookies()).find((cookie) => cookie.name === "next-auth.session-token");
    expect(authCookie).toBeTruthy();
    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: authCookie!.value,
        url: "http://localhost:3200",
        httpOnly: true,
        sameSite: "Lax",
        expires: authCookie!.expires,
      },
    ]);
    await page.goto(`/invite/${inviteToken}/claim`);
    await expect(page).toHaveURL(new RegExp(`/command-center/${project.id}`));
    await expect(page.getByText(/BYOC Transition Baseline/)).toBeVisible();
    await expect(page.getByText("Governed scope from claim forward")).toBeVisible();
    await expect(page.getByText("Client has a partially working operations console in staging.")).toBeVisible();

    const claimed = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: {
        client_id: true,
        organization_id: true,
        status: true,
        invite_token: true,
        activity_logs: {
          where: { action: "SYSTEM_EVENT" },
          select: { metadata: true },
        },
        messages: {
          where: { is_system_message: true },
          select: { content: true },
        },
      },
    });

    expect(claimed.client_id).toBe(client.id);
    expect(claimed.organization_id).toBe(organization.id);
    expect(claimed.status).toBe("ACTIVE");
    expect(claimed.invite_token).toBeNull();
    const claimActivity = claimed.activity_logs.find((log) => (log.metadata as any)?.operation === "BYOC_INVITE_CLAIMED");
    expect(claimActivity).toBeTruthy();
    expect((claimActivity?.metadata as any)?.next_action).toBe("FUND_FIRST_MILESTONE");
    expect((claimActivity?.metadata as any)?.transition_mode).toBe("running project");
    expect((claimActivity?.metadata as any)?.first_milestone_title).toBe("Operations repair handoff");
    expect(claimed.messages.some((message) => message.content.includes("Private BYOC packet claimed"))).toBe(true);
    expect(claimed.messages.some((message) => message.content.includes('fund "Operations repair handoff"'))).toBe(true);

    const buyerNotification = await prisma.notification.findUnique({
      where: { source_key: `byoc_invite_claimed_buyer_${project.id}_${client.id}` },
      select: { user_id: true, type: true, href: true, metadata: true, message: true },
    });

    expect(buyerNotification?.user_id).toBe(client.id);
    expect(buyerNotification?.type).toBe("MILESTONE");
    expect(buyerNotification?.href).toBe(`/command-center/${project.id}`);
    expect((buyerNotification?.metadata as any)?.next_action).toBe("FUND_FIRST_MILESTONE");
    expect(buyerNotification?.message).toContain("fund the first milestone");

    await page.goto(`/invite/${inviteToken}/claim`);
    await expect(page).toHaveURL(/\/dashboard/);

    const stillClaimed = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { client_id: true, organization_id: true, status: true, invite_token: true },
    });
    expect(stillClaimed).toEqual({
      client_id: client.id,
      organization_id: organization.id,
      status: "ACTIVE",
      invite_token: null,
    });
  } finally {
    if (organizationId) {
      await prisma.project.updateMany({ where: { organization_id: organizationId }, data: { organization_id: null } });
      await prisma.organizationMember.deleteMany({ where: { organization_id: organizationId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
    }
    await cleanupByEmailPrefix(prefix);
  }
});
