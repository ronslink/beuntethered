import {
  type EvidenceSourceVerificationInput,
  type EvidenceSystemCheckResult,
  type EvidenceSystemCheckSummary,
  getEvidenceVerificationProfile,
} from "./evidence-verification.ts";

type EvidenceCheckFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type EvidenceSystemCheckOptions = {
  fetcher?: EvidenceCheckFetcher;
  now?: Date;
};

const REACHABILITY_TIMEOUT_MS = 4500;

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

function metadataText(metadata: unknown, key: string) {
  const value = metadataRecord(metadata)[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseEvidenceUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, hosts: string[]) {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function check(
  key: string,
  label: string,
  status: EvidenceSystemCheckResult["status"],
  detail: string,
  critical = false,
): EvidenceSystemCheckResult {
  return { key, label, status, detail, critical };
}

function hasCustomDomainContext(metadata: unknown) {
  const note = `${metadataText(metadata, "verification_note")} ${metadataText(metadata, "proof_use")}`.toLowerCase();
  return note.includes("custom domain") || note.includes("client domain") || note.includes("production domain");
}

async function reachabilityCheck(
  url: URL,
  fetcher: EvidenceCheckFetcher,
): Promise<EvidenceSystemCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    let response = await fetcher(url.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetcher(url.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      });
    }

    if (response.status >= 200 && response.status < 400) {
      return check("url_reachable", "URL reachable", "passed", `The provider URL responded with HTTP ${response.status}.`);
    }
    if (response.status === 401 || response.status === 403) {
      return check("url_reachable", "URL protected", "pending", `The provider URL responded with HTTP ${response.status}; ask for buyer-visible access or a walkthrough.`);
    }
    if (response.status === 404 || response.status === 410) {
      return check("url_reachable", "URL not found", "failed", `The provider URL responded with HTTP ${response.status}. Confirm the link is correct.`);
    }

    return check("url_reachable", "URL inconclusive", "pending", `The provider URL responded with HTTP ${response.status}; confirm during buyer review.`);
  } catch {
    return check("url_reachable", "URL reachability pending", "pending", "The URL could not be reached during the automated check. This can happen with private, sleeping, or protected services.");
  } finally {
    clearTimeout(timeout);
  }
}

function providerSpecificReferenceCheck(source: EvidenceSourceVerificationInput, parsedUrl: URL | null) {
  const pathname = parsedUrl?.pathname ?? "";
  const metadata = metadataRecord(source.metadata);

  switch (source.type) {
    case "GITHUB": {
      const pathParts = pathname.split("/").filter(Boolean);
      return check(
        "github_reference",
        "Repository reference",
        pathParts.length >= 2 ? "passed" : "failed",
        pathParts.length >= 2
          ? "The GitHub link includes an owner and repository reference."
          : "Use a repository, pull request, commit, release, or branch URL.",
        pathParts.length < 2,
      );
    }
    case "DOMAIN":
      return check(
        "domain_launch_reference",
        "Launch URL",
        parsedUrl ? "passed" : "failed",
        parsedUrl
          ? "A reviewable launch URL is available for SSL and buyer workflow checks."
          : "Add the production domain or a DNS proof URL.",
        !parsedUrl,
      );
    case "SUPABASE": {
      const note = `${metadataText(metadata, "verification_note")} ${metadataText(metadata, "proof_use")}`.toLowerCase();
      const mentionsSecret = note.includes("service_role") || note.includes("service role") || note.includes("secret key");
      return check(
        "secret_hygiene",
        "Secret hygiene",
        mentionsSecret ? "failed" : "passed",
        mentionsSecret
          ? "Do not paste Supabase service-role keys or production secrets into evidence notes."
          : "No obvious secret-sharing language was found in the evidence note.",
        mentionsSecret,
      );
    }
    case "OTHER":
      return check(
        "artifact_context",
        "Artifact context",
        metadataText(metadata, "verification_note").length >= 20 ? "passed" : "pending",
        "Supporting evidence should explain which milestone and acceptance check it proves.",
      );
    default:
      return check(
        "provider_reference",
        "Provider reference",
        parsedUrl ? "passed" : "failed",
        parsedUrl ? "A provider or deployment link was captured." : "Add a provider, deployment, service, route, or dashboard-safe evidence link.",
        !parsedUrl,
      );
  }
}

export async function runEvidenceSourceSystemCheck(
  source: EvidenceSourceVerificationInput,
  options: EvidenceSystemCheckOptions = {},
): Promise<EvidenceSystemCheckSummary> {
  const profile = getEvidenceVerificationProfile(source.type);
  const fetcher = options.fetcher ?? fetch;
  const checkedAt = (options.now ?? new Date()).toISOString();
  const parsedUrl = parseEvidenceUrl(source.url);
  const checks: EvidenceSystemCheckResult[] = [];
  const signals: string[] = [];
  const nextActions: string[] = [];
  const urlRequired = source.type !== "OTHER";

  checks.push(
    check(
      "url_present",
      urlRequired ? "Provider link present" : "Artifact link optional",
      !urlRequired || Boolean(source.url) ? "passed" : "failed",
      urlRequired
        ? "A provider, deployment, service, route, repository, or domain URL is required for automated review."
        : "Other evidence can be verified by artifact context even without a public URL.",
      urlRequired && !source.url,
    ),
  );

  if (source.url && !parsedUrl) {
    checks.push(check("url_format", "URL format", "failed", "The evidence link is not a valid URL.", true));
    nextActions.push("Replace the evidence link with a full https:// URL or attach the proof as a file.");
  }

  if (parsedUrl) {
    checks.push(check("url_format", "URL format", "passed", "The evidence link is a valid URL."));
    checks.push(
      check(
        "https",
        "HTTPS",
        parsedUrl.protocol === "https:" ? "passed" : "failed",
        parsedUrl.protocol === "https:"
          ? "The evidence link uses HTTPS."
          : "Use an HTTPS provider link before relying on this evidence for escrow release.",
        parsedUrl.protocol !== "https:",
      ),
    );

    if (profile.recognizedHosts.length > 0) {
      const hostFit = hostMatches(parsedUrl.hostname.toLowerCase(), profile.recognizedHosts);
      const customDomain = hasCustomDomainContext(source.metadata);
      checks.push(
        check(
          "provider_host",
          "Provider host",
          hostFit ? "passed" : customDomain ? "pending" : "pending",
          hostFit
            ? `The URL host matches ${profile.label}.`
            : customDomain
              ? "The URL appears to be a custom domain; confirm the provider mapping during review."
              : `The host does not match the common ${profile.label} domains. Confirm if this is a custom domain or dashboard-safe link.`,
        ),
      );
    }

    checks.push(await reachabilityCheck(parsedUrl, fetcher));
  }

  checks.push(providerSpecificReferenceCheck(source, parsedUrl));

  const note = metadataText(source.metadata, "verification_note");
  checks.push(
    check(
      "milestone_mapping_note",
      "Milestone mapping",
      note.length >= 20 ? "passed" : "pending",
      note.length >= 20
        ? "The evidence note maps this source to a milestone or acceptance check."
        : "Add a note explaining which milestone, deployment, commit, run, or acceptance check this source proves.",
    ),
  );

  if (checks.some((item) => item.key === "url_reachable" && item.status === "passed")) {
    signals.push("Provider link responded during automated source check.");
  }
  if (checks.some((item) => item.key === "provider_host" && item.status === "passed")) {
    signals.push(`URL matches a recognized ${profile.label} host.`);
  }
  if (checks.some((item) => item.key === "milestone_mapping_note" && item.status === "passed")) {
    signals.push("Evidence note maps source to milestone review.");
  }

  for (const item of checks) {
    if (item.status === "failed" && item.critical) nextActions.push(item.detail);
  }
  if (checks.some((item) => item.key === "url_reachable" && item.status === "pending")) {
    nextActions.push("If the service is private, sleeping, or protected, include a walkthrough or log sample in the milestone evidence packet.");
  }

  return {
    checkedAt,
    providerLabel: profile.label,
    sourceType: profile.type,
    checks,
    signals: Array.from(new Set(signals)).slice(0, 4),
    nextActions: Array.from(new Set(nextActions)).slice(0, 4),
  };
}
