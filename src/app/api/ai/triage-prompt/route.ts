import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getCurrentUser } from "@/lib/session";
import { getTaskAIProvider } from "@/lib/ai-router";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { promptTriageInputSchema } from "@/lib/validators";

// Fast triage — highspeed model, sub-second target
export const maxDuration = 15;

// Hardcoded blocklist for obvious abuse (checked before any LLM call)
const BLOCKED_PATTERNS = [
  /\b(kill|murder|bomb|weapon|drug|cocaine|heroin|meth)\b/i,
  /\b(hack\s+into|steal\s+data|phishing|ransomware)\b/i,
  /\b(child\s+porn|csam|underage)\b/i,
];

// Platform scope definition
const PLATFORM_SCOPE = `BeUntethered is a human-led, AI-assisted software delivery marketplace.

The platform is for verifiable software and digital product outcomes led by accountable facilitators.
AI may assist with scoping, coding, review, documentation, and evidence collection, but the facilitator remains responsible for quality and handoff.

SUPPORTED categories:
- Software MVPs and SaaS/web app builds
- Internal tools, admin dashboards, portals, CRM/workflow tools
- Mobile app prototypes or clearly scoped mobile modules
- API integrations, payment flows, webhooks, SaaS integrations, and automation scripts
- AI-assisted business automations, agent workflows, and chatbot/productivity systems
- Data dashboards, reporting, light ETL, and operational analytics
- Legacy app modernization, refactors, bug fixing, QA hardening, performance/security readiness
- Discovery/SOW/architecture work when it produces a concrete, reviewable delivery plan

Every in-scope project must be remotely deliverable and verifiable through evidence such as preview links, repository or source archives, screenshots, logs, test reports, API docs, runbooks, exported files, or handoff notes.

NOT SUPPORTED (return in_scope: false):
- Broad freelance/gig work: resume writing, copywriting, blog posts, translation, social media, generic SEO, data entry, virtual assistant work, audio/video editing
- Standalone logo/brand/illustration work unless it is explicitly part of a software product delivery scope
- Pure hourly staff augmentation with no outcome, acceptance criteria, or delivery evidence
- Physical goods, manufacturing, construction, or in-person services
- Licensed professional services: legal advice, medical diagnosis, financial advisory
- Illegal or harmful activities of any kind`;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in before classifying a project request.", code: "TRIAGE_AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsedInput = promptTriageInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json({
        in_scope: false,
        code: "TRIAGE_REQUEST_INVALID",
        reason: parsedInput.error.issues[0]?.message ?? "Please describe what you need.",
      }, { status: 400 });
    }

    await assertDurableRateLimit({
      key: rateLimitKey("ai.triage-prompt", user.id),
      limit: 40,
      windowMs: 60 * 60 * 1000,
    });

    const { prompt } = parsedInput.data;

    // Layer 1: Instant blocklist check (zero latency)
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        return NextResponse.json({
          in_scope: false,
          code: "TRIAGE_BLOCKED",
          reason: "This request contains content that isn't allowed on BeUntethered."
        }, { status: 400 });
      }
    }

    // Layer 2: LLM triage using the configured basic-task lane.
    const highspeed = getTaskAIProvider("prompt_triage");

    const { text: rawTriage } = await generateText({
      model: highspeed,
      system: `You are a request classifier for BeUntethered. Classify whether the user's request fits the platform.

${PLATFORM_SCOPE}

Return ONLY a JSON object with this exact structure:
{
  "in_scope": true or false,
  "category": "one of: software_mvp, web_app, internal_tool, mobile_app, api_integration, ai_automation, data_dashboard, app_modernization, qa_hardening, discovery_sow, other_software",
  "complexity": "simple or medium or complex",
  "summary": "A short 3-8 word human description of what they need",
  "reason": "Only if in_scope is false — a friendly 1-sentence explanation"
}

Complexity guide:
- simple: under ~8 hours work (small bug fix, script, landing page update, single integration tweak)
- medium: 8-40 hours (app feature, workflow automation, dashboard, mobile prototype, integration)
- complex: 40+ hours (MVP, full web app, multi-system integration, modernization, launch-ready product)

Return ONLY the JSON. No markdown, no explanation.`,
      prompt: prompt,
    });

    // Parse triage response
    let cleaned = rawTriage.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    }

    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    const triage = JSON.parse(cleaned);
    return NextResponse.json(triage);

  } catch (error: any) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    console.error("Triage Error:", error);
    // Fail open — let them proceed with defaults rather than blocking
    return NextResponse.json({
      in_scope: true,
      category: "other_software",
      complexity: "medium",
      summary: "Project scope",
      source: "fallback"
    });
  }
}
