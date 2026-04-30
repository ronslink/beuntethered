import { NextResponse } from "next/server";
export { hashAgentToken, isAgentTokenShape, readAgentBearerToken } from "./agent-api-rules.ts";

export type AgentApiErrorCode =
  | "AGENT_AUTH_MISSING"
  | "AGENT_AUTH_INVALID"
  | "AGENT_AUTH_DENIED"
  | "AGENT_REQUEST_INVALID"
  | "AGENT_PROJECT_NOT_FOUND"
  | "AGENT_MILESTONE_NOT_FOUND"
  | "AGENT_MILESTONE_FORBIDDEN"
  | "AGENT_MILESTONE_NOT_SUBMITTABLE"
  | "AGENT_MILESTONE_CONFLICT"
  | "AGENT_API_FAILED";

export function agentApiError({
  error,
  code,
  status,
  extra,
}: {
  error: string;
  code: AgentApiErrorCode | string;
  status: number;
  extra?: Record<string, unknown>;
}) {
  return NextResponse.json({ error, code, ...(extra ?? {}) }, { status });
}
