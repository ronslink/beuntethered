import type { SowGuardrailReport, SowGuardrailReportItem } from "@/lib/sow-guardrails";

type ScopeValidationReportCardProps = {
  report: SowGuardrailReport;
  className?: string;
  eyebrow?: string;
  description?: string;
  titlePassed?: string;
  titleAttention?: string;
  gridClassName?: string;
};

function itemTone(item: SowGuardrailReportItem) {
  if (item.status === "passed") {
    return {
      border: "border-secondary/20",
      text: "text-secondary",
      icon: "verified",
    };
  }

  if (item.status === "not_applicable") {
    return {
      border: "border-outline-variant/20",
      text: "text-on-surface-variant",
      icon: "remove_circle",
    };
  }

  return {
    border: "border-tertiary/25",
    text: "text-tertiary",
    icon: "priority_high",
  };
}

function referenceLabel(item: SowGuardrailReportItem) {
  const parts = [
    item.expected ? `Expected ${item.expected}` : "",
    item.actual ? `Actual ${item.actual}` : "",
  ].filter(Boolean);

  return parts.join(" / ");
}

function coverageLabel(label: string, values?: string[]) {
  if (!values || values.length === 0) return null;

  return `${label}: ${values.join(", ")}`;
}

export function ScopeValidationReportCard({
  report,
  className = "",
  eyebrow = "Scope validation report",
  description = "This checks the generated SOW against budget, timeline, regions, components, and milestone evidence.",
  titlePassed = "Buyer constraints are preserved.",
  titleAttention = "Review items before posting.",
  gridClassName = "md:grid-cols-2 xl:grid-cols-5",
}: ScopeValidationReportCardProps) {
  const passed = report.overallStatus === "passed";

  return (
    <section className={`rounded-lg border p-4 ${passed ? "border-secondary/20 bg-secondary/5" : "border-tertiary/25 bg-tertiary/5"} ${className}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${passed ? "text-secondary" : "text-tertiary"}`}>
            {eyebrow}
          </p>
          <h4 className="mt-1 text-sm font-black text-on-surface">
            {passed ? titlePassed : titleAttention}
          </h4>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {description}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1 rounded-md border bg-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${passed ? "border-secondary/20 text-secondary" : "border-tertiary/25 text-tertiary"}`}>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{passed ? "verified" : "rule"}</span>
          {passed ? "Passed" : "Needs Review"}
        </span>
      </div>

      <div className={`mt-4 grid gap-2 ${gridClassName}`}>
        {report.items.map((item) => {
          const tone = itemTone(item);
          const reference = referenceLabel(item);
          const present = coverageLabel("Present", item.present);
          const missing = coverageLabel("Missing", item.missing);

          return (
            <div
              key={item.key}
              className={`rounded-md border bg-surface p-3 ${tone.border}`}
            >
              <div className="flex items-start gap-2">
                <span className={`material-symbols-outlined mt-0.5 text-[16px] ${tone.text}`} aria-hidden="true">
                  {tone.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-on-surface">{item.label}</p>
                  {reference && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {reference}
                    </p>
                  )}
                  {(present || missing) && (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {[present, missing].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
