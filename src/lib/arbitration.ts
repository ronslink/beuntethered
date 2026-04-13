import OpenAI from "openai";

/** ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

export interface ArbitrationResult {
  objective_score: number; // 0–100
  evidence_summary: string;
  criteria_met: string[];
  criteria_missed: string[];
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Canonical shape this function expects the AppMap JSON to conform to.
 * Expand / adjust the discriminated-union types as your log stream evolves.
 */
export type AppMapEvent =
  | { type: "git"; action: "commit" | "push" | "branch"; details: string; timestamp: string }
  | { type: "deployment"; status: "started" | "success" | "failed"; environment: string; timestamp: string }
  | { type: "test"; name: string; status: "pass" | "fail" | "skip"; duration_ms?: number; timestamp: string }
  | { type: "error"; message: string; stack?: string; timestamp: string }
  | { type: "api"; method: string; path: string; status: number; duration_ms?: number; timestamp: string }
  | { type: "custom"; label: string; details: string; timestamp: string };

export interface AppMap {
  version: string;
  generated_at: string;
  events: AppMapEvent[];
  metadata?: {
    commit_sha?: string;
    branch?: string;
    author?: string;
    environment?: string;
    [key: string]: unknown;
  };
}

/** ------------------------------------------------------------------
 * Internal helpers
 * ------------------------------------------------------------------ */

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreToLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 75) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

/** ------------------------------------------------------------------
 * Main exported function
 * ------------------------------------------------------------------ */

/**
 * Evaluates the confidence of a Statement of Work against an AppMap log stream.
 *
 * @param sow_text  – The raw Statement of Work text
 * @param appmap_json_string – AppMap log stream as a JSON string
 * @returns Structured result with objective_score (0–100), evidence_summary,
 *          criteria_met, criteria_missed, and confidence_level.
 */
export async function evaluatePayloadConfidence(
  sow_text: string,
  appmap_json_string: string
): Promise<ArbitrationResult> {
  // ── 1. Parse AppMap ────────────────────────────────────────────────
  let appmap: AppMap;
  try {
    appmap = JSON.parse(appmap_json_string) as AppMap;
  } catch {
    return {
      objective_score: 0,
      evidence_summary:
        "AppMap JSON is malformed and could not be parsed.",
      criteria_met: [],
      criteria_missed: [
        "AppMap parse failure — cannot evaluate",
        "No structured evidence available",
      ],
      confidence_level: "LOW",
    };
  }

  if (!Array.isArray(appmap.events)) {
    return {
      objective_score: 0,
      evidence_summary:
        "AppMap JSON is valid but missing the required 'events' array.",
      criteria_met: [],
      criteria_missed: ["AppMap structure invalid — cannot evaluate"],
      confidence_level: "LOW",
    };
  }

  // ── 2. Summarise AppMap into a compact evidence string ─────────────
  const eventSummary = summariseEvents(appmap);

  // ── 3. Ask the LLM to score & reason ───────────────────────────────
  const client = getOpenAIClient();

  const systemPrompt = `You are an objective AI Value Arbitration Engine.
Your job is to compare a Statement of Work (SOW) against an execution log (AppMap)
and produce a fair, evidence-based confidence score.

Score range: 0–100
- 90–100: Every SOW deliverable is evidenced, timeline aligns, zero red flags
- 70–89:  Most deliverables evidenced, minor gaps or one quality signal missing
- 45–69:  Several gaps; partial evidence only; some timeline misalignment
-  0–44:  Major gaps; critical items missing; scope creep or failure signals present

Evaluate FOUR criteria:
1. COMPLETENESS (max 25 pts) – Are all SOW deliverables evidenced in the AppMap?
2. TIMELINE ALIGNMENT (max 25 pts) – Does the event timestamp range match SOW milestones?
3. QUALITY SIGNALS (max 25 pts) – Passing tests, no errors, clean deployments, no failed builds.
4. SCOPE CREEP DETECTION (max 25 pts) – No AppMap events fall outside the SOW scope.
   Scope creep: work performed that was never mentioned or implied by the SOW.
   Detecting scope creep actually BOOSTS the score (shows audit rigour).

Return your answer STRICTLY as a JSON object with this exact shape — no markdown,
no prose outside the JSON:
{
  "objective_score": <integer 0–100>,
  "evidence_summary": "<2–4 sentence summary of findings>",
  "criteria_met": ["<string>", ...],
  "criteria_missed": ["<string>", ...],
  "confidence_level": "HIGH" | "MEDIUM" | "LOW"
}

confidence_level thresholds:
  HIGH   >= 75
  MEDIUM 45–74
  LOW    < 45`;

  const userPrompt = `## Statement of Work
${sow_text}

## AppMap Evidence Summary
${eventSummary}

## Raw AppMap (for reference)
${JSON.stringify(appmap, null, 2)}

Respond with ONLY the JSON object.`;

  let llmRaw: string;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,   // low temperature for consistent, objective output
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    llmRaw = response.choices[0]?.message?.content ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenAI API call failed during arbitration: ${message}`);
  }

  // ── 4. Parse LLM response ──────────────────────────────────────────
  let parsed: Partial<ArbitrationResult>;
  try {
    parsed = JSON.parse(llmRaw) as Partial<ArbitrationResult>;
  } catch {
    return {
      objective_score: 0,
      evidence_summary:
        "LLM returned malformed JSON. Arbitration could not complete.",
      criteria_met: [],
      criteria_missed: [
        "LLM response parse failure",
        "Arbitration result unavailable",
      ],
      confidence_level: "LOW",
    };
  }

  // Validate and normalise fields
  const objective_score =
    typeof parsed.objective_score === "number"
      ? clampScore(parsed.objective_score)
      : 0;

  return {
    objective_score,
    evidence_summary:
      typeof parsed.evidence_summary === "string" && parsed.evidence_summary.length > 0
        ? parsed.evidence_summary
        : "No evidence summary provided by arbitration engine.",
    criteria_met: Array.isArray(parsed.criteria_met) ? parsed.criteria_met : [],
    criteria_missed: Array.isArray(parsed.criteria_missed)
      ? parsed.criteria_missed
      : ["Criteria list missing from arbitration response."],
    confidence_level: scoreToLevel(objective_score),
  };
}

/** ------------------------------------------------------------------
 * Internal: summarise events into a compact text block for the LLM
 * ------------------------------------------------------------------ */

function summariseEvents(appmap: AppMap): string {
  const lines: string[] = [];

  lines.push(`AppMap generated at: ${appmap.generated_at}`);
  lines.push(`Total events logged: ${appmap.events.length}`);

  if (appmap.metadata?.commit_sha) {
    lines.push(`Latest commit SHA: ${appmap.metadata.commit_sha}`);
  }
  if (appmap.metadata?.branch) {
    lines.push(`Branch: ${appmap.metadata.branch}`);
  }
  if (appmap.metadata?.environment) {
    lines.push(`Environment: ${appmap.metadata.environment}`);
  }

  // Group by type
  const byType = new Map<string, AppMapEvent[]>();
  for (const evt of appmap.events) {
    byType.set(evt.type, [...(byType.get(evt.type) ?? []), evt]);
  }

  const print = (label: string, events: AppMapEvent[], fn: (e: AppMapEvent) => string) => {
    if (events.length === 0) return;
    lines.push(`\n--- ${label} (${events.length}) ---`);
    for (const e of events) {
      lines.push(fn(e));
    }
  };

  print("GIT EVENTS", byType.get("git") ?? [], (e) => {
    const evt = e as Extract<AppMapEvent, { type: "git" }>;
    return `  [${evt.timestamp}] ${evt.action}: ${evt.details}`;
  });

  print("DEPLOYMENTS", byType.get("deployment") ?? [], (e) => {
    const evt = e as Extract<AppMapEvent, { type: "deployment" }>;
    return `  [${evt.timestamp}] ${evt.status} → ${evt.environment}`;
  });

  print("TESTS", byType.get("test") ?? [], (e) => {
    const evt = e as Extract<AppMapEvent, { type: "test" }>;
    return `  [${evt.timestamp}] ${evt.name}: ${evt.status.toUpperCase()}${evt.duration_ms ? ` (${evt.duration_ms}ms)` : ""}`;
  });

  const errors = byType.get("error") ?? [];
  if (errors.length > 0) {
    lines.push(`\n--- ERRORS (${errors.length}) ---`);
    for (const e of errors) {
      const evt = e as Extract<AppMapEvent, { type: "error" }>;
      lines.push(`  [${evt.timestamp}] ERROR: ${evt.message}`);
    }
  }

  print("API CALLS (sample, first 20)", (byType.get("api") ?? []).slice(0, 20), (e) => {
    const evt = e as Extract<AppMapEvent, { type: "api" }>;
    return `  [${evt.timestamp}] ${evt.method} ${evt.path} → ${evt.status}${evt.duration_ms ? ` (${evt.duration_ms}ms)` : ""}`;
  });

  print("CUSTOM EVENTS", byType.get("custom") ?? [], (e) => {
    const evt = e as Extract<AppMapEvent, { type: "custom" }>;
    return `  [${evt.timestamp}] ${evt.label}: ${evt.details}`;
  });

  return lines.join("\n");
}
