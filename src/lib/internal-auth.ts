export type InternalRequestAuthResult =
  | { ok: true; mode: "secret" | "development" }
  | { ok: false; code: "INTERNAL_SECRET_MISSING" | "INTERNAL_ACCESS_DENIED"; status: 401 | 503; message: string };

export function requireInternalRequest(
  req: Request,
  options: { allowDevelopmentFallback?: boolean } = {}
): InternalRequestAuthResult {
  const allowDevelopmentFallback = options.allowDevelopmentFallback ?? true;
  const configuredSecret = process.env.INTERNAL_API_SECRET?.trim();
  const providedSecret = req.headers.get("x-internal-secret")?.trim();

  if (!configuredSecret) {
    if (allowDevelopmentFallback && process.env.NODE_ENV !== "production") {
      return { ok: true, mode: "development" };
    }

    return {
      ok: false,
      code: "INTERNAL_SECRET_MISSING",
      status: 503,
      message: "Internal request secret is not configured.",
    };
  }

  if (providedSecret === configuredSecret) {
    return { ok: true, mode: "secret" };
  }

  return {
    ok: false,
    code: "INTERNAL_ACCESS_DENIED",
    status: 401,
    message: "Internal access denied.",
  };
}
