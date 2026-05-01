import assert from "node:assert/strict";
import test from "node:test";
import { getEvidenceProviderBrand } from "../src/lib/evidence-provider-branding.ts";

test("returns brand marks for supported evidence providers", () => {
  assert.equal(getEvidenceProviderBrand("NETLIFY").label, "Netlify");
  assert.ok(getEvidenceProviderBrand("NETLIFY").icon?.path);
  assert.equal(getEvidenceProviderBrand("CLOUDFLARE").label, "Cloudflare");
  assert.ok(getEvidenceProviderBrand("SUPABASE").icon?.path);
});

test("falls back safely for providers without packaged icons", () => {
  const heroku = getEvidenceProviderBrand("HEROKU");
  assert.equal(heroku.label, "Heroku");
  assert.equal(heroku.icon, null);
  assert.equal(heroku.fallbackText, "H");

  assert.equal(getEvidenceProviderBrand("UNKNOWN").label, "Other evidence");
});
