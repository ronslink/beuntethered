import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { runSavedSearchAlerts } from "@/lib/saved-search-alerts";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

function readBearerToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim();
}

async function canRunSavedSearchAlerts(req: Request) {
  const configuredSecrets = [
    process.env.CRON_SECRET,
    process.env.INTERNAL_API_SECRET,
  ].filter((value): value is string => Boolean(value));
  const providedSecret = req.headers.get("x-internal-secret") || readBearerToken(req);
  if (configuredSecrets.length > 0) {
    return Boolean(providedSecret && configuredSecrets.includes(providedSecret));
  }

  const user = await getCurrentUser();
  return isPlatformAdminEmail(user?.email);
}

async function handleSavedSearchAlerts(req: Request) {
  if (!(await canRunSavedSearchAlerts(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSavedSearchAlerts();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return handleSavedSearchAlerts(req);
}

export async function POST(req: Request) {
  return handleSavedSearchAlerts(req);
}
