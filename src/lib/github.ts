import { createHmac, timingSafeEqual } from "node:crypto";

export type GitHubWebhookVerificationResult =
  | { ok: true; skipped?: true }
  | { ok: false; status: 401 | 503; code: string; message: string };

export function verifyGitHubWebhookSignature({
  payload,
  signatureHeader,
  secret = process.env.GITHUB_WEBHOOK_SECRET,
  nodeEnv = process.env.NODE_ENV,
}: {
  payload: string;
  signatureHeader: string | null;
  secret?: string;
  nodeEnv?: string;
}): GitHubWebhookVerificationResult {
  const configuredSecret = secret?.trim();
  if (!configuredSecret) {
    if (nodeEnv === "production") {
      return {
        ok: false,
        status: 503,
        code: "GITHUB_WEBHOOK_SECRET_MISSING",
        message: "GitHub webhook signing is not configured.",
      };
    }
    return { ok: true, skipped: true };
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return {
      ok: false,
      status: 401,
      code: "GITHUB_SIGNATURE_MISSING",
      message: "GitHub webhook signature is required.",
    };
  }

  const expected = `sha256=${createHmac("sha256", configuredSecret).update(payload).digest("hex")}`;
  const provided = signatureHeader.trim();
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return {
      ok: false,
      status: 401,
      code: "GITHUB_SIGNATURE_INVALID",
      message: "GitHub webhook signature is invalid.",
    };
  }

  return { ok: true };
}

export async function fetchGitHubDiff(url: string, token?: string): Promise<{ success: boolean, diff?: string, error?: string }> {
  try {
    if (!url.includes("github.com")) {
       return { success: false, error: "Enter a valid GitHub URL." };
    }

    let diffUrl = url.trim();
    if (!diffUrl.endsWith(".diff") && !diffUrl.endsWith(".patch")) {
        // Remove trailing slashes and append .diff
        diffUrl = `${diffUrl.replace(/\/$/, "")}.diff`;
    }

    const headers: HeadersInit = {
       "Accept": "application/vnd.github.v3.diff",
       "User-Agent": "Untether-AI-Code-Auditor"
    };

    if (token) {
       headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(diffUrl, { headers });

    if (!res.ok) {
        if (res.status === 404) {
           return { success: false, error: "GitHub could not find that repository or diff. Check the URL and connected access token." };
        }
        return { success: false, error: `GitHub returned status ${res.status}. Please check the repository access settings.` };
    }

    const diffText = await res.text();
    return { success: true, diff: diffText };
  } catch(e: any) {
    console.error("Github Network Scraper Error:", e);
    return { success: false, error: e.message };
  }
}
