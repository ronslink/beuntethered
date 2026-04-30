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
  budget: string | null;
  timelineDays: number | null;
};

function unique(items: string[]) {
  return [...new Set(items)];
}

function formatCurrencyAmount(raw: string) {
  const compact = raw.replace(/[,$\s]/g, "");
  const value = Number(compact);
  if (!Number.isFinite(value)) return raw.trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
  const match =
    text.match(/\b(?:budget|cost|price|spend|for)\s*(?:is|of|around|about|up to|under|:)?\s*\$?\s*([0-9][0-9,\s]{2,})(?:\s*(?:usd|dollars?))?\b/i) ||
    text.match(/\$\s*([0-9][0-9,\s]{2,})\b/);

  return match ? formatCurrencyAmount(match[1]) : null;
}

export function summarizeScopeConstraints({
  regions,
  budget,
  timelineDays,
}: ScopeConstraints) {
  const parts: string[] = [];
  if (regions.length > 0) parts.push(`Markets: ${regions.join(", ")}`);
  if (budget) parts.push(`Budget: ${budget}`);
  if (timelineDays) parts.push(`Timeline: ${timelineDays} days`);
  return parts;
}

export function buildRegionCoverageSentence(regions: string[]) {
  if (regions.length === 0) return "";
  return `The scope must support operations across ${regions.join(", ")}.`;
}

export function executiveSummaryWithScopeConstraints(summary: unknown, constraints: ScopeConstraints) {
  const text = typeof summary === "string" ? summary.trim() : "";
  const missingRegions = constraints.regions.filter(
    (region) => !new RegExp(`\\b${region.replace(/\s+/g, "\\s+")}\\b`, "i").test(text)
  );
  const regionSentence = buildRegionCoverageSentence(missingRegions);

  if (!regionSentence) return text;
  return text ? `${text} ${regionSentence}` : regionSentence;
}
