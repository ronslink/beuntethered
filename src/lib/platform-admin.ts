export const DEFAULT_PLATFORM_ADMIN_EMAIL = "admin@untether.network";

type AdminEnv = Record<string, string | undefined>;

export function getPlatformAdminEmail(env: AdminEnv = process.env) {
  return env.ADMIN_EMAIL?.trim() || DEFAULT_PLATFORM_ADMIN_EMAIL;
}

export function isPlatformAdminEmail(email: string | null | undefined, env: AdminEnv = process.env) {
  return Boolean(email && email.toLowerCase() === getPlatformAdminEmail(env).toLowerCase());
}

export function requirePlatformAdminEmail(email: string | null | undefined, env: AdminEnv = process.env) {
  if (!isPlatformAdminEmail(email, env)) {
    throw new Error("Platform admin permissions are required.");
  }
}
