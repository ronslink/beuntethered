import assert from "node:assert/strict";
import test from "node:test";
import { buildAppUrl, getAppBaseUrl } from "../src/lib/app-url.ts";

test("resolves canonical app URLs for emails and redirects", () => {
  assert.equal(getAppBaseUrl({ NEXTAUTH_URL: "https://app.example.com/" }), "https://app.example.com");
  assert.equal(getAppBaseUrl({ NEXT_PUBLIC_APP_URL: "https://public.example.com/" }), "https://public.example.com");
  assert.equal(getAppBaseUrl({ VERCEL_URL: "untether.vercel.app" }), "https://untether.vercel.app");
  assert.equal(getAppBaseUrl({}), "http://127.0.0.1:3200");

  assert.equal(buildAppUrl("/projects/project_1", { NEXTAUTH_URL: "https://app.example.com/" }), "https://app.example.com/projects/project_1");
  assert.equal(buildAppUrl("dashboard", { NEXTAUTH_URL: "https://app.example.com" }), "https://app.example.com/dashboard");
});
