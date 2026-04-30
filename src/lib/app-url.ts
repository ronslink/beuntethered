type AppUrlEnv = Partial<Record<"NEXTAUTH_URL" | "NEXT_PUBLIC_APP_URL" | "VERCEL_URL", string>>;

export function getAppBaseUrl(env: AppUrlEnv = process.env) {
  if (env.NEXTAUTH_URL?.trim()) return env.NEXTAUTH_URL.trim().replace(/\/+$/, "");
  if (env.NEXT_PUBLIC_APP_URL?.trim()) return env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
  if (env.VERCEL_URL?.trim()) return `https://${env.VERCEL_URL.trim().replace(/\/+$/, "")}`;
  return "http://127.0.0.1:3200";
}

export function buildAppUrl(path: string, env: AppUrlEnv = process.env) {
  const baseUrl = getAppBaseUrl(env);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
