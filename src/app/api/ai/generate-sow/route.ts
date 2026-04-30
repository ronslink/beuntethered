import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getCurrentUser } from "@/lib/session";
import { getDynamicAIProvider } from "@/lib/ai-router";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import {
  alignMilestoneAmountsToBudget,
  alignMilestoneDurationsToTimeline,
  extractRequestedTimelineDays,
  normalizeGeneratedSow,
} from "@/lib/milestone-quality";
import { getMilestoneVerificationPatternGuide } from "@/lib/milestone-proof";
import {
  executiveSummaryWithScopeConstraints,
  extractBudgetAmountConstraint,
  extractBudgetConstraint,
  extractCentralComponentConstraints,
  extractRegionConstraints,
  summarizeScopeConstraints,
  type ScopeConstraints,
} from "@/lib/scope-constraints";
import {
  createSowGenerationCacheKey,
  getCachedSowGeneration,
  setCachedSowGeneration,
} from "@/lib/sow-generation-cache";
import { sowGenerationInputSchema } from "@/lib/validators";

// Single-pass generation — 60s is plenty
export const maxDuration = 60;

// ─── Pricing guides by category (market-realistic ranges) ─────────────────
const PRICING: Record<string, { simple: string; medium: string; complex: string }> = {
  software_mvp:      { simple: "$800–$2,500", medium: "$2,500–$10,000", complex: "$10,000–$40,000" },
  web_app:           { simple: "$500–$1,500", medium: "$1,500–$6,000",  complex: "$6,000–$25,000" },
  internal_tool:     { simple: "$500–$1,500", medium: "$1,500–$6,000",  complex: "$6,000–$20,000" },
  mobile_app:        { simple: "$800–$2,500", medium: "$2,500–$10,000", complex: "$10,000–$35,000" },
  api_integration:   { simple: "$300–$1,200", medium: "$1,200–$5,000",  complex: "$5,000–$18,000" },
  ai_automation:     { simple: "$500–$1,500", medium: "$1,500–$7,500",  complex: "$7,500–$25,000" },
  data_dashboard:    { simple: "$400–$1,200", medium: "$1,200–$5,000",  complex: "$5,000–$18,000" },
  app_modernization: { simple: "$800–$2,000", medium: "$2,000–$8,000",  complex: "$8,000–$30,000" },
  qa_hardening:      { simple: "$300–$1,000", medium: "$1,000–$4,000",  complex: "$4,000–$12,000" },
  discovery_sow:     { simple: "$1,000",      medium: "$1,000–$2,500",  complex: "$2,500–$5,000" },
  other_software:    { simple: "$500–$1,500", medium: "$1,500–$6,000",  complex: "$6,000–$20,000" },
};

// ─── Banned jargon (enforced in simple/medium tiers) ──────────────────────
const BANNED_SIMPLE = `
BANNED phrases for this tier — do NOT use any of these:
- "Executive Summary", "Verified Valuation", "Acceptance Criteria"
- "Escrow", "Architectural Blueprint", "Technical Architecture"
- "Phase 1/2/3", "Sprint", "Pipeline", "Engine"
- Any consulting-firm language
`;

type GeneratedMilestone = {
  title?: unknown;
  description?: unknown;
  deliverables?: unknown;
  acceptance_criteria?: unknown;
  [key: string]: unknown;
};

type GeneratedSow = {
  executiveSummary?: unknown;
  milestones?: unknown;
  [key: string]: unknown;
};

const TANGIBLE_OUTPUT_TERMS =
  /\b(report|log|checklist|build|release|deployed|document|file|files|screen|page|flow|endpoint|schema|dashboard|prototype|wireframe|mockup|copy|content|integration|configuration|handoff|runbook|plan|link|export)\b/i;

const PROCESS_ONLY_DELIVERABLES = [
  /^testing$/i,
  /^testing\s+(and|&)\s+bug\s+fix(es)?$/i,
  /^bug\s+fix(es)?$/i,
  /^fixing\s+bugs$/i,
  /^qa$/i,
  /^qa\s+(and|&)\s+testing$/i,
  /^debugging$/i,
  /^polish$/i,
  /^revisions?$/i,
  /^feedback\s+rounds?$/i,
  /^meetings?$/i,
  /^communication$/i,
  /^support$/i,
  /^deployment$/i,
];

const MILESTONE_QUALITY_RUBRIC = `
MILESTONE QUALITY RUBRIC:
- Treat each milestone as a release gate: the buyer should be able to fund it, review it, approve it, or dispute it on its own.
- A good milestone delivers one buyer-visible outcome, not a work phase. Prefer titles like "Authenticated User Access", "Payment Checkout Flow", "Admin Reporting Dashboard", or "Mobile App Prototype".
- Never use vague milestone titles such as "Phase 1", "Development", "Testing", "Bug Fixes", "Polish", "Launch", or "Deployment".
- Each description must say what capability or artifact will exist when the milestone is complete.
- Each deliverable must be a noun phrase for an inspectable output: screen, flow, endpoint, build, release, source archive, design file, report, dashboard, integration, automation, document, runbook, or evidence package.
- Do not list process work as deliverables: testing, QA, bug fixes, debugging, meetings, communication, revisions, support, deployment, or launch.
- If testing, QA, deployment, bug fixes, or review are needed, express them as acceptance evidence tied to the delivered output.
- Acceptance criteria must be pass/fail checks. Each milestone needs at least 2 checks, and at least one check must reference proof: preview link, staging URL, source archive, screenshots, logs, QA report, defect log, test evidence, handoff notes, or exported files.
- For software work, acceptance criteria should follow actor-action-result language: "Buyer can...", "User can...", "Admin can...", "Webhook records...", "API returns...".
- Avoid milestones that only prepare for later work unless the preparation artifact itself is useful and reviewable, such as approved wireframes, database schema, integration plan, or architecture report.
- Amounts should roughly match effort and risk. Do not make a tiny first milestone carry most of the budget unless it clearly delivers most of the value.
- Before returning JSON, silently reject any milestone that a non-technical buyer could not verify from a screen, file, link, log, report, or handoff artifact.
`;

const VERIFICATION_PATTERN_GUIDE = getMilestoneVerificationPatternGuide();

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isProcessOnlyDeliverable(value: string) {
  const text = cleanText(value);
  if (!text) return true;
  if (TANGIBLE_OUTPUT_TERMS.test(text)) return false;
  return PROCESS_ONLY_DELIVERABLES.some((pattern) => pattern.test(text));
}

function fallbackDeliverablesFor(milestone: GeneratedMilestone) {
  const title = cleanText(milestone.title) || "Milestone";
  const context = `${title} ${cleanText(milestone.description)}`.toLowerCase();

  if (context.includes("auth") || context.includes("login")) {
    return ["Working login and registration flow", "Role-based access control rules", "Password reset user flow"];
  }

  if (context.includes("stripe") || context.includes("billing") || context.includes("payment")) {
    return ["Stripe checkout and customer billing flow", "Payment status screen", "Payment webhook handling"];
  }

  if (context.includes("audit")) {
    return ["Admin audit log view", "Tracked activity event records", "Audit log filtering or export"];
  }

  if (context.includes("project") || context.includes("status")) {
    return ["Customer project status dashboard", "Admin project update workflow", "Project status history"];
  }

  if (context.includes("design") || context.includes("wireframe") || context.includes("mockup")) {
    return ["Approved visual mockups", "Responsive screen designs", "Design handoff files"];
  }

  return [`Working ${title.toLowerCase()} flow`, `${title} handoff notes`, "Client-reviewable staging update"];
}

function normalizeDeliverables(milestone: GeneratedMilestone) {
  const raw = Array.isArray(milestone.deliverables)
    ? milestone.deliverables.map(cleanText).filter(Boolean)
    : [];
  const deliverables = raw.filter((deliverable) => !isProcessOnlyDeliverable(deliverable));
  const removedProcessItem = deliverables.length !== raw.length;

  for (const fallback of fallbackDeliverablesFor(milestone)) {
    if (deliverables.length >= 2) break;
    if (!deliverables.some((item) => item.toLowerCase() === fallback.toLowerCase())) {
      deliverables.push(fallback);
    }
  }

  return { deliverables: deliverables.slice(0, 4), removedProcessItem };
}

function withQualityAcceptanceCriteria(criteria: string, includeQualityCriteria: boolean) {
  const base = criteria || "Client can review and approve the listed deliverables.";
  if (!includeQualityCriteria || /\b(test|qa|quality|bug|defect)\b/i.test(base)) return base;
  return `${base} Quality is verified against the agreed flows, and defects found during review are resolved before approval.`;
}

function normalizeSowDeliverables(parsed: GeneratedSow) {
  if (!Array.isArray(parsed.milestones)) return parsed;

  return normalizeGeneratedSow({
    ...parsed,
    milestones: parsed.milestones.map((rawMilestone) => {
      const milestone = rawMilestone as GeneratedMilestone;
      const { deliverables, removedProcessItem } = normalizeDeliverables(milestone);

      return {
        ...milestone,
        deliverables,
        acceptance_criteria: withQualityAcceptanceCriteria(
          cleanText(milestone.acceptance_criteria),
          removedProcessItem
        ),
      };
    }),
  });
}

// ─── Few-shot examples by complexity ──────────────────────────────────────
const EXAMPLES = {
  simple: `
Example 1 (small integration fix):
{
  "title": "Stripe Webhook Fix",
  "executiveSummary": "Repair the Stripe webhook flow so paid invoices update the customer account reliably.",
  "milestones": [
    {
      "title": "Webhook Payment Sync",
      "description": "Update the Stripe webhook handler so successful invoice payments mark the customer account as paid and record the event for review.",
      "deliverables": ["Updated webhook handler", "Payment status update flow", "Webhook event log entry"],
      "acceptance_criteria": "Buyer can trigger a Stripe test payment and see the customer account marked paid. Webhook logs show the processed event ID and status update evidence.",
      "estimated_duration_days": 2,
      "amount": 650
    }
  ],
  "totalAmount": 650
}

Example 2 (dashboard enhancement):
{
  "title": "Admin Status Filter",
  "executiveSummary": "Add a filter to the admin dashboard so the team can review active, paid, and disputed projects faster.",
  "milestones": [
    {
      "title": "Project Status Filter",
      "description": "Add status filtering to the admin project dashboard and preserve the selected filter in the URL for team review.",
      "deliverables": ["Status filter control", "Filtered project table", "URL state for selected status"],
      "acceptance_criteria": "Admin can filter projects by status and refresh the page without losing the selected filter. Screenshots or a preview URL show each supported status state.",
      "estimated_duration_days": 3,
      "amount": 900
    }
  ],
  "totalAmount": 900
}`,

  medium: `
Example (multi-page website):
{
  "title": "Business Website Redesign",
  "executiveSummary": "Redesign your existing website with a modern look, mobile-friendly layout, and updated content across 5-8 pages.",
  "milestones": [
    {
      "title": "Design & Layout",
      "description": "Create wireframes and visual designs for all pages. Mobile-responsive layouts with your brand colors and typography.",
      "deliverables": ["Wireframes for all pages", "Visual mockups", "Mobile-responsive designs"],
      "acceptance_criteria": "Client can review wireframes and visual mockups for every planned page. Mobile and desktop designs are included in the handoff files.",
      "estimated_duration_days": 7,
      "amount": 1200
    },
    {
      "title": "Live Website Build",
      "description": "Build the approved designs into a live website. Includes content migration, contact forms, basic SEO setup, and deployment.",
      "deliverables": ["Deployed responsive website", "Contact form integration", "Basic SEO metadata", "Hosting handoff notes"],
      "acceptance_criteria": "Client can open the live website and review every planned page on mobile and desktop. Contact form submissions are received and basic SEO metadata is visible in page source.",
      "estimated_duration_days": 10,
      "amount": 1800
    }
  ],
  "totalAmount": 3000
}`,

  complex: `
Example (full web application):
{
  "title": "Project Management SaaS MVP",
  "executiveSummary": "Full-stack web application with user authentication, team workspaces, task boards, and real-time notifications. Built for launch-readiness.",
  "milestones": [
    {
      "title": "Foundation & Auth",
      "description": "Set up the project infrastructure, database schema, user registration and login, team invitation system, and role-based permissions.",
      "deliverables": ["Project infrastructure setup", "User auth with email/password and OAuth", "Team invitation system", "Role-based access control"],
      "acceptance_criteria": "Users can register, log in, create teams, and invite members with assigned roles. Handoff includes source archive or repository access with setup notes.",
      "estimated_duration_days": 14,
      "amount": 3000
    },
    {
      "title": "Core Features",
      "description": "Build the task board with drag-and-drop, project views (list/board/calendar), file attachments, and commenting system.",
      "deliverables": ["Drag-and-drop task board", "Multiple project views", "File attachment system", "Commenting and activity feed"],
      "acceptance_criteria": "Users can create, assign, and manage tasks across all view types with attachments and comments. Activity records show task changes and uploaded file evidence.",
      "estimated_duration_days": 14,
      "amount": 4000
    },
    {
      "title": "Notifications & Mobile Release",
      "description": "Add real-time notifications, email digests, responsive mobile views, and a release-ready build with handoff evidence.",
      "deliverables": ["Real-time notification flow", "Email digest system", "Mobile-responsive app screens", "Release build and handoff notes"],
      "acceptance_criteria": "Users receive in-app notifications and email digests for tracked task events. Buyer can review the release build on mobile and desktop with handoff notes and defect resolution evidence.",
      "estimated_duration_days": 10,
      "amount": 3000
    }
  ],
  "totalAmount": 10000
}`
};

// ─── Build the prompt for each complexity tier ────────────────────────────
function buildSowPrompt(
  category: string,
  complexity: string,
  prompt: string,
  mode: string,
  desiredTimeline: string,
  scopeConstraints: ScopeConstraints
) {
  const priceRange = PRICING[category] || PRICING.other_software;
  const tierPrice = priceRange[complexity as keyof typeof priceRange] || priceRange.medium;
  const examples = EXAMPLES[complexity as keyof typeof EXAMPLES] || EXAMPLES.medium;
  const scopeConstraintSummary = summarizeScopeConstraints(scopeConstraints);
  
  const timelineHint = desiredTimeline 
    ? `\nThe client wants this done within: "${desiredTimeline}". Fit your timeline to this.`
    : '';
  const preservedConstraints = scopeConstraintSummary.length
    ? `
CLIENT-PROVIDED CONSTRAINTS TO PRESERVE EXACTLY:
${scopeConstraintSummary.map((item) => `- ${item}`).join("\n")}
Do not omit, merge, reinterpret, or summarize away named regions, central components, budget, or timeline constraints. If the client names North America, Asia, and Middle East, all three must appear in the executiveSummary and relevant milestone descriptions. If the client names explicit components, every component must appear in at least one milestone deliverable or acceptance criterion.${scopeConstraints.budget ? ` The sum of all milestone amount fields and totalAmount must equal exactly ${scopeConstraints.budget}.` : ""}`
    : "";

  const isDiscovery = mode === 'DISCOVERY';

  if (isDiscovery) {
    return {
      system: `You are an accountable software facilitator writing a quick discovery scope for a client. Write in plain, friendly English like a real person talking to a client, not a consulting firm writing a proposal.

Return ONLY a JSON object. No markdown, no extra text.

This is a $1,000 discovery/architecture session — single milestone only.
The milestone must be meaningful, realistic, actionable, and verifiable. Acceptance criteria must be a short pass/fail checklist.
${preservedConstraints}

${MILESTONE_QUALITY_RUBRIC}
UNTETHER VERIFICATION PATTERNS:
Every discovery milestone must fit the document handoff pattern and name the handoff evidence the facilitator must submit.
${VERIFICATION_PATTERN_GUIDE}`,
      prompt: `The client wants to explore: ${prompt}

Return this exact JSON structure:
{
  "title": "Short human title (2-5 words)",
  "executiveSummary": "1-2 sentences max, plain English",
  "milestones": [
    {
      "title": "Discovery & Architecture",
      "description": "Brief description of what the discovery session covers",
      "deliverables": ["Discovery findings summary", "Recommended architecture plan", "Milestone delivery roadmap"],
      "acceptance_criteria": "Client can review the discovery findings summary. Client can approve a milestone roadmap with clear next delivery checkpoints. Handoff includes enough notes or diagrams to verify the recommended architecture.",
      "estimated_duration_days": 7,
      "amount": 1000
    }
  ],
  "totalAmount": 1000
}`
    };
  }

  const milestoneRules = complexity === 'simple'
    ? `Create exactly 1 milestone. Keep the total scope under 150 words. Price should be realistic for this type of work: ${tierPrice}.
${BANNED_SIMPLE}`
    : complexity === 'medium'
    ? `Create exactly 2 milestones. Keep the total scope under 400 words. Total price should be in the range: ${tierPrice}.`
    : `Create 3-5 milestones depending on scope. Keep the total scope under 800 words. Total price should be in the range: ${tierPrice}.`;

  return {
    system: `You are an accountable software facilitator writing a project scope for a client on BeUntethered, a human-led, AI-assisted software delivery marketplace.

RULES:
- Write like a human facilitator talking to a client, NOT like a consulting firm proposal.
- Use plain, friendly English. No jargon, no buzzwords.
- The facilitator may use AI-assisted workflows, but the scope must read as human-led delivery with clear accountability.
- Keep titles short and human (2-5 words).
- ${milestoneRules}
${MILESTONE_QUALITY_RUBRIC}
UNTETHER VERIFICATION PATTERNS:
Every milestone must clearly fit at least one of these verification patterns. Choose the pattern that best matches the deliverable and write acceptance criteria that name the evidence the facilitator must submit.
${VERIFICATION_PATTERN_GUIDE}

- Each milestone must have 2-4 concrete deliverables.
- Deliverables must be tangible outputs the client can inspect, use, download, open, run, or approve.
- Do NOT list process tasks as deliverables: testing, bug fixes, QA, debugging, meetings, revisions, communication, or support.
- If quality work is needed, put it in acceptance_criteria as reviewable standards or evidence, such as a QA report, resolved defect log, or verified release build.
- Every milestone must be meaningful, realistic, actionable, and verifiable as an independently fundable delivery checkpoint.
- Avoid generic phase names like "Phase 1", "Milestone 2", "Testing", "Polish", or "Deployment".
- Acceptance criteria must include at least two pass/fail checks tied to user-visible behavior, delivered artifacts, preview links, source archives, logs, reports, or handoff evidence.
- Milestones should usually be 3-15 days; split anything too broad into smaller reviewable outcomes.
- Price realistically for this category (${category.replace(/_/g, ' ')}).${timelineHint}
${preservedConstraints}

Here are examples of the tone and structure I want:
${examples}

Return ONLY a valid JSON object matching the structure in the examples. No markdown fences, no explanation.`,
    prompt: `The client says: "${prompt}"`
  };
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in before generating a project scope.", code: "SOW_AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsedInput = sowGenerationInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error: parsedInput.error.issues[0]?.message ?? "Please describe what you need.",
          code: "SOW_REQUEST_INVALID",
        },
        { status: 400 }
      );
    }

    await assertDurableRateLimit({
      key: rateLimitKey("ai.generate-sow", user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });

    const { prompt, mode, desiredTimeline, category, complexity } = parsedInput.data;
    const dynamicModel = await getDynamicAIProvider(user.id);
    const cacheKey = createSowGenerationCacheKey({
      userId: user.id,
      prompt,
      mode,
      desiredTimeline,
      category,
      complexity,
    });
    const cached = getCachedSowGeneration(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    const requestedTimelineDays = extractRequestedTimelineDays(desiredTimeline, prompt);
    const scopeConstraints = {
      regions: extractRegionConstraints(prompt),
      components: extractCentralComponentConstraints(prompt),
      budget: extractBudgetConstraint(prompt),
      budgetAmount: extractBudgetAmountConstraint(prompt),
      timelineDays: requestedTimelineDays,
    };

    // Build category+complexity routed prompt
    const sowPrompt = buildSowPrompt(category, complexity, prompt, mode, desiredTimeline, scopeConstraints);

    // Single-pass generation
    const { text: rawOutput } = await generateText({
      model: dynamicModel,
      system: sowPrompt.system,
      prompt: sowPrompt.prompt,
      temperature: 0,
      topP: 0.1,
    });

    // Strip <think> reasoning traces from M2.7 output
    let cleaned = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Strip markdown code fences
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    // Extract JSON object via brace detection
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
       cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    let parsedJson: GeneratedSow;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("AI SOW JSON parse failed:", parseError);
      return NextResponse.json(
        {
          error: "The AI draft could not be converted into a project scope. Please try again.",
          code: "SOW_GENERATION_INVALID",
        },
        { status: 502 }
      );
    }

    const normalized = alignMilestoneAmountsToBudget(
      alignMilestoneDurationsToTimeline(
        normalizeSowDeliverables(parsedJson),
        requestedTimelineDays
      ),
      scopeConstraints.budgetAmount
    );
    const parsed = {
      ...normalized,
      executiveSummary: executiveSummaryWithScopeConstraints(normalized.executiveSummary, scopeConstraints),
    };
    setCachedSowGeneration(cacheKey, parsed);
    return NextResponse.json(parsed);

  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Unable to generate a project scope right now. Please try again.", code: "SOW_PROVIDER_FAILED" },
      { status: 500 }
    );
  }
}
