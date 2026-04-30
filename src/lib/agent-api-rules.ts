import crypto from "crypto";

export function isAgentTokenShape(token: string) {
  return /^unth_[a-f0-9]{64}$/i.test(token);
}

export function hashAgentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function readAgentBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false as const,
      code: "AGENT_AUTH_MISSING" as const,
      status: 401,
      error: "Missing or invalid authorization header.",
    };
  }

  const token = authHeader.slice("bearer ".length).trim();
  if (!isAgentTokenShape(token)) {
    return {
      ok: false as const,
      code: "AGENT_AUTH_INVALID" as const,
      status: 401,
      error: "Invalid automation API key.",
    };
  }

  return { ok: true as const, token };
}
