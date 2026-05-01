import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMilestoneEvidencePacket,
  getProjectEvidenceSourceCoverage,
  summarizeEvidenceSources,
} from "../src/lib/delivery-evidence.ts";

test("summarizes project evidence source coverage by provider", () => {
  const coverage = getProjectEvidenceSourceCoverage([
    { type: "GITHUB", status: "CONNECTED" },
    { type: "VERCEL", status: "PENDING_VERIFICATION" },
    { type: "NETLIFY", status: "CONNECTED" },
    { type: "RAILWAY", status: "CONNECTED" },
    { type: "RENDER", status: "CONNECTED" },
    { type: "SUPABASE", status: "NEEDS_ATTENTION" },
  ]);

  assert.equal(coverage.connectedCount, 4);
  assert.equal(coverage.pendingCount, 1);
  assert.equal(coverage.attentionCount, 1);
  assert.equal(coverage.readyForAudit, false);
  assert.equal(coverage.summary.find((item) => item.type === "GITHUB")?.status, "connected");
  assert.equal(coverage.summary.find((item) => item.type === "NETLIFY")?.status, "connected");
  assert.equal(coverage.summary.find((item) => item.type === "RAILWAY")?.status, "connected");
  assert.equal(coverage.summary.find((item) => item.type === "RENDER")?.status, "connected");
  assert.equal(coverage.summary.find((item) => item.type === "DOMAIN")?.status, "missing");
});

test("marks evidence source coverage audit-ready when connected sources have no attention gaps", () => {
  const summary = summarizeEvidenceSources([
    { type: "GITHUB", status: "CONNECTED" },
    { type: "VERCEL", status: "CONNECTED" },
  ]);

  assert.equal(summary.find((item) => item.type === "GITHUB")?.connected, true);
  assert.equal(getProjectEvidenceSourceCoverage([
    { type: "GITHUB", status: "CONNECTED" },
    { type: "VERCEL", status: "CONNECTED" },
  ]).readyForAudit, true);
});

test("builds milestone evidence packet readiness from proof artifacts", () => {
  const packet = buildMilestoneEvidencePacket({
    id: "milestone_1",
    title: "Billing portal delivery",
    description: "Deliver a working preview, source archive, and QA evidence.",
    deliverables: ["Preview deployment", "Source archive", "QA report"],
    acceptance_criteria: ["Buyer can open the preview", "Source package is attached"],
    live_preview_url: "https://preview.example.com",
    payload_storage_path: "https://storage.example.com/source.zip",
    attachments: [{ purpose: "MILESTONE_SUBMISSION", name: "evidence.txt" }],
  });

  assert.equal(packet.ready, true);
  assert.equal(packet.missingCount, 0);
  assert.equal(packet.availableCount, packet.requiredCount);
});
