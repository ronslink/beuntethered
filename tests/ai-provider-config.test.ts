import assert from "node:assert/strict";
import test from "node:test";
import {
  getBasicAIProviderPreference,
  getGemmaServerConfig,
  getGroqConfig,
  isBasicAITask,
  isGroqConfigured,
  isServerGemmaConfigured,
  isSupportedAIProvider,
  resolveBasicAIProvider,
} from "../src/lib/ai-provider-config.ts";

test("recognizes supported AI provider choices", () => {
  assert.equal(isSupportedAIProvider("minimax"), true);
  assert.equal(isSupportedAIProvider("gemini-1.5-pro"), true);
  assert.equal(isSupportedAIProvider("gemma-4-server"), true);
  assert.equal(isSupportedAIProvider("unknown-model"), false);
});

test("reads self-hosted Gemma server configuration", () => {
  assert.equal(isServerGemmaConfigured({}), false);

  const config = getGemmaServerConfig({
    GEMMA_BASE_URL: "http://127.0.0.1:8000/v1/",
    GEMMA_MODEL: "gemma-4-custom",
    GEMMA_API_KEY: "server-key",
  });

  assert.equal(config.configured, true);
  assert.equal(config.baseURL, "http://127.0.0.1:8000/v1");
  assert.equal(config.model, "gemma-4-custom");
  assert.equal(config.apiKey, "server-key");
});

test("reads Groq basic-lane configuration", () => {
  assert.equal(isGroqConfigured({}), false);

  const config = getGroqConfig({
    GROQ_API_KEY: "groq-key",
    GROQ_BASE_URL: "https://api.groq.com/openai/v1/",
    GROQ_MODEL: "llama-test",
  });

  assert.equal(config.configured, true);
  assert.equal(config.apiKey, "groq-key");
  assert.equal(config.baseURL, "https://api.groq.com/openai/v1");
  assert.equal(config.model, "llama-test");
});

test("defaults basic AI routing to Groq and ignores unsupported choices", () => {
  assert.equal(getBasicAIProviderPreference({}), "groq");
  assert.equal(getBasicAIProviderPreference({ AI_BASIC_PROVIDER: "gemma-4-server" }), "gemma-4-server");
  assert.equal(getBasicAIProviderPreference({ AI_BASIC_PROVIDER: "minimax" }), "minimax");
  assert.equal(getBasicAIProviderPreference({ AI_BASIC_PROVIDER: "unknown" }), "groq");
});

test("separates basic AI tasks from trust-sensitive tasks", () => {
  assert.equal(isBasicAITask("prompt_triage"), true);
  assert.equal(isBasicAITask("summary"), true);
  assert.equal(isBasicAITask("sow_generation"), false);
  assert.equal(isBasicAITask("milestone_audit"), false);
});

test("resolves basic AI provider fallbacks without touching API clients", () => {
  assert.equal(resolveBasicAIProvider({
    preference: "groq",
    groqConfigured: true,
    gemmaConfigured: true,
  }), "groq");

  assert.equal(resolveBasicAIProvider({
    preference: "groq",
    groqConfigured: false,
    gemmaConfigured: true,
  }), "gemma-4-server");

  assert.equal(resolveBasicAIProvider({
    preference: "gemma-4-server",
    groqConfigured: true,
    gemmaConfigured: false,
  }), "groq");

  assert.equal(resolveBasicAIProvider({
    preference: "minimax",
    groqConfigured: true,
    gemmaConfigured: true,
  }), "minimax");

  assert.equal(resolveBasicAIProvider({
    preference: "groq",
    groqConfigured: false,
    gemmaConfigured: false,
  }), "minimax");
});
