const MARKET_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "North America", pattern: /\bnorth\s+america\b/i },
  { label: "Latin America", pattern: /\blatin\s+america\b/i },
  { label: "South America", pattern: /\bsouth\s+america\b/i },
  { label: "Middle East", pattern: /\bmiddle\s+east\b|\bmena\b/i },
  { label: "Asia", pattern: /\basia\b|\bapac\b/i },
  { label: "Europe", pattern: /\beurope\b|\beu\b|\bemea\b/i },
  { label: "Africa", pattern: /\bafrica\b/i },
  { label: "Australia", pattern: /\baustralia\b|\boceania\b/i },
  { label: "US", pattern: /\b(?:US|U\.S\.|USA|United States|united states)\b/ },
  { label: "Canada", pattern: /\bcanada\b/i },
  { label: "UAE", pattern: /\buae\b|\bunited\s+arab\s+emirates\b/i },
  { label: "Philippines", pattern: /\bphilippines\b/i },
];

export type ScopeConstraints = {
  regions: string[];
  components: string[];
  budget: string | null;
  budgetAmount: number | null;
  timelineDays: number | null;
};

function unique(items: string[]) {
  return [...new Set(items)];
}

function formatCurrencyAmount(raw: string) {
  const value = parseBudgetAmount(raw);
  if (value === null || !Number.isFinite(value)) return raw.trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseBudgetAmount(raw: string) {
  const compact = raw.replace(/[,$\s]/g, "");
  const value = Number(compact);
  return Number.isFinite(value) ? value : null;
}

export function extractRegionConstraints(text: string) {
  return unique(
    MARKET_PATTERNS.map((entry) => ({ label: entry.label, index: text.search(entry.pattern) }))
      .filter((entry) => entry.index >= 0)
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.label)
  );
}

export function extractBudgetConstraint(text: string) {
  const amount = extractBudgetAmountConstraint(text);
  return amount ? formatCurrencyAmount(String(amount)) : null;
}

export function extractBudgetAmountConstraint(text: string) {
  const match =
    text.match(/\b(?:budget|cost|price|spend|for)\s*(?:is|of|around|about|up to|under|:)?\s*\$?\s*([0-9][0-9,\s]{2,})(?:\s*(?:usd|dollars?))?\b/i) ||
    text.match(/\$\s*([0-9][0-9,\s]{2,})\b/);

  return match ? parseBudgetAmount(match[1]) : null;
}

export function extractCentralComponentConstraints(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  const match =
    normalized.match(/\b(?:with|including|includes|needs)\s+(.+?)(?:\.\s*(?:built|target|budget|timeline|duration|deadline)\b|\.?$)/i) ||
    normalized.match(/\bcovering\s+(.+?)(?:\.\s*(?:built|target|budget|timeline|duration|deadline)\b|\.?$)/i);
  if (!match) return [];

  return unique(
    match[1]
      .replace(/\b(core|basic|launch-ready|launch readiness)\b/gi, "")
      .split(/\s*,\s*|\s+and\s+/i)
      .map((item) => item.replace(/^(?:and|or)\s+/i, "").trim())
      .filter((item) => item.length >= 4)
      .slice(0, 8)
  );
}

export function summarizeScopeConstraints({
  regions,
  components,
  budget,
  timelineDays,
}: ScopeConstraints) {
  const parts: string[] = [];
  if (regions.length > 0) parts.push(`Markets: ${regions.join(", ")}`);
  if (components.length > 0) parts.push(`Components: ${components.join(", ")}`);
  if (budget) parts.push(`Budget: ${budget}`);
  if (timelineDays) parts.push(`Timeline: ${timelineDays} days`);
  return parts;
}

export function buildRegionCoverageSentence(regions: string[]) {
  if (regions.length === 0) return "";
  return `The scope must support operations across ${regions.join(", ")}.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string) {
  return new RegExp(escapeRegExp(term).replace(/\s+/g, "\\s+"), "i").test(text);
}

function unsupportedMarketEntries(text: string, allowedRegions: string[]) {
  const allowed = new Set(allowedRegions.map((region) => region.toLowerCase()));
  return MARKET_PATTERNS.filter((entry) => !allowed.has(entry.label.toLowerCase()) && entry.pattern.test(text));
}

function removeUnsupportedMarketSentences(text: string, allowedRegions: string[]) {
  if (!text || allowedRegions.length === 0) return text;

  const unsupported = unsupportedMarketEntries(text, allowedRegions);
  if (unsupported.length === 0) return text;

  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const safeSentences = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !unsupported.some((entry) => entry.pattern.test(sentence)));

  return safeSentences.join(" ").trim() || "This scope defines a milestone-based delivery plan for the requested software application.";
}

function normalizeCriteria(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/\n|;|(?<=\.)\s+/g)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function componentCoverageCriterion(component: string) {
  return `Client can verify ${component} in a preview, evidence package, report, or handoff artifact.`;
}

export function executiveSummaryWithScopeConstraints(summary: unknown, constraints: ScopeConstraints) {
  const rawText = typeof summary === "string" ? summary.trim() : "";
  const text = removeUnsupportedMarketSentences(rawText, constraints.regions);
  const missingRegions = constraints.regions.filter(
    (region) => !containsTerm(text, region)
  );
  const missingComponents = constraints.components.filter(
    (component) => !containsTerm(text, component)
  );
  const regionSentence = buildRegionCoverageSentence(missingRegions);
  const componentSentence = missingComponents.length > 0
    ? `The scope must include ${missingComponents.join(", ")}.`
    : "";
  const budgetSentence = constraints.budget && !containsTerm(text, constraints.budget)
    ? `Target budget is ${constraints.budget}.`
    : "";
  const timelineSentence = constraints.timelineDays && !containsTerm(text, `${constraints.timelineDays} days`)
    ? `Target timeline is ${constraints.timelineDays} days.`
    : "";

  const additions = [regionSentence, componentSentence, budgetSentence, timelineSentence].filter(Boolean).join(" ");
  if (!additions) return text;
  return text ? `${text} ${additions}` : additions;
}

export function ensureSowPreservesScopeConstraints<T extends { executiveSummary?: unknown; milestones?: unknown; [key: string]: unknown }>(
  sow: T,
  constraints: ScopeConstraints
): T {
  const guarded = {
    ...sow,
    executiveSummary: executiveSummaryWithScopeConstraints(sow.executiveSummary, constraints),
  };

  if (!Array.isArray(guarded.milestones) || constraints.components.length === 0) {
    return guarded;
  }

  const milestoneText = JSON.stringify(guarded.milestones);
  const missingComponents = constraints.components.filter((component) => !containsTerm(milestoneText, component));
  if (missingComponents.length === 0) return guarded;

  const milestones = guarded.milestones.map((milestone) => (
    milestone && typeof milestone === "object" ? { ...(milestone as Record<string, unknown>) } : milestone
  ));

  missingComponents.forEach((component, index) => {
    const targetIndex = index % milestones.length;
    const milestone = milestones[targetIndex];
    if (!milestone || typeof milestone !== "object") return;

    const target = milestone as Record<string, unknown>;
    const deliverables = Array.isArray(target.deliverables)
      ? target.deliverables.map((item) => String(item).trim()).filter(Boolean)
      : [];
    if (!deliverables.some((item) => containsTerm(item, component)) && deliverables.length < 4) {
      deliverables.push(component);
      target.deliverables = deliverables;
    }

    const criteria = normalizeCriteria(target.acceptance_criteria);
    const criterion = componentCoverageCriterion(component);
    if (!criteria.some((item) => containsTerm(item, component))) {
      criteria.push(criterion);
      target.acceptance_criteria = criteria.join("\n");
    }
  });

  return {
    ...guarded,
    milestones,
  };
}
