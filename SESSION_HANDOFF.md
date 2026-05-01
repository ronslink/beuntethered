# Untether Session Handoff

Last updated: 2026-05-01

## Current Product Direction

Untether is being positioned as a trust-first, AI-assisted software delivery marketplace, not an hourly staffing marketplace. The core promise is:

> Hire AI-assisted software facilitators for verified milestone-based delivery.

Important positioning decisions made in this session:

- Facilitators are humans assisted by AI, not pure AI agents.
- Work should be outcome-based and milestone-driven.
- Buyer SOW amounts and durations are reference only for facilitators.
- No generic project market prices should be published before enough project-specific context exists.
- BYOC means a facilitator brings a running or private client project into Untether for escrow, milestones, evidence, and workflow governance.
- BYOC origin agreements are excluded from platform arbitration/dispute handling because Untether cannot verify the original external agreement.
- Evidence integrations should improve bid confidence and milestone verification.
- Preferred proof integrations now include GitHub, Vercel, Netlify, Cloudflare, Railway, Render, Fly.io, DigitalOcean, Heroku, Supabase, domain proof, and generic evidence.

## Environment Notes

- Workspace: `D:\beuntethered`
- Local app has been running on `http://127.0.0.1:3200`
- Port 3000 was already in use, so 3200 is the expected local review port.
- Production is on Vercel with Supabase as the database.
- Vercel stores production environment variables.
- Do not write secrets into this file or commit secrets. User previously provided API keys in chat; keep them in local/Vercel env only.

## Git State

Recent pushed commits on `main`:

- `50253e5 feat: deep link wallet milestone actions`
- `7667097 feat: map wallet escrow states`
- `54ebb4c feat: match opportunities by proof capability`
- `728c8ca feat: add facilitator proof capabilities`
- `f211bc8 feat: guide proposal proof confidence`
- `3219b71 feat: add bid proof confidence review`
- `ccf4eba feat: add facilitator proof readiness profiles`
- `ffb352e feat: add automated evidence source checks`

Known unrelated dirty state that has been intentionally left alone:

- Deleted scratch files:
  - `appmap.log`
  - `scratch_ai_react.mjs`
  - `scratch_info.mjs`
  - `scratch_info_2.mjs`
  - `scratch_info_3.mjs`
  - `scratch_info_4.mjs`
  - `scratch_pg.js`
  - `scratch_test.mjs`
  - `scratch_test.ts`
- Untracked:
  - `info_pitch_idea/`

Do not revert or stage those unless the user explicitly asks.

## Recent Completed Work

### Wallet And Escrow Legibility

Files touched recently:

- `src/app/(dashboard)/wallet/page.tsx`
- `src/app/(dashboard)/command-center/[id]/page.tsx`
- `src/lib/wallet-ledger.ts`
- `tests/wallet-ledger.test.ts`
- `tests/e2e/wallet-funding-forecast.spec.ts`

Implemented:

- Role-aware wallet metrics for clients and facilitators.
- Funding forecast for client pending milestones.
- Explicit escrow state map:
  - pending funding
  - funded escrow
  - submitted review
  - paid/released
  - disputed
- Wallet action queue backed by real milestone state.
- Wallet action links now deep-link to command center milestone anchors:
  - `/command-center/[projectId]?tab=war-room#milestone-[milestoneId]`
- Command center milestone cards now expose milestone IDs as anchors with scroll margin.

### Proof Capabilities And Evidence Integrations

Implemented across recent commits:

- `User.proof_capabilities` field and migration `0006_facilitator_proof_capabilities`.
- Facilitator settings profile supports selecting active proof capabilities.
- Talent page shows provider branded chips and filters by evidence source/capability.
- Marketplace opportunity matching uses proof capability fit.
- Bid modal shows live proof confidence.
- Evidence integration system supports provider-specific checks and automated source checks.

### Proposal Advisor And Pricing Direction

Implemented across prior slices:

- Facilitator Proposal Advisor treats buyer budget/timeline as reference only.
- Quick bid/full proposal pricing fields start blank.
- Public pricing copy keeps fee math only:
  - 8% marketplace client fee
  - 5% BYOC client fee
  - 0% facilitator fee
- Centralized fee helpers in `src/lib/platform-fees.ts`.

### Scope Intake Direction

Implemented across prior slices:

- Buyer scope intake uses required budget and timeline fields.
- AI guardrails track scope history and constraints.
- Quality guidance blocks vague or process-only milestone requests.
- Project target extraction supports common software delivery categories, including database migration.
- Guardrails preserve named regions and avoid substituting countries not supplied by the buyer.
- No generic market price shown too early.

## Verification Commands That Have Been Passing

Common checks:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Focused wallet checks:

```powershell
npm test -- --test-name-pattern="wallet milestone actions|wallet ledger|wallet funding forecast|wallet escrow summary"
$env:PLAYWRIGHT_REUSE_SERVER='1'; npx playwright test tests/e2e/wallet-funding-forecast.spec.ts --workers=1 --reporter=line
```

Other recently used checks:

```powershell
npm test -- --test-name-pattern="opportunity fit|proof capability"
npx playwright test tests/e2e/marketplace-proof-fit.spec.ts tests/e2e/saved-search-alerts.spec.ts tests/e2e/invite-to-bid.spec.ts --workers=1 --reporter=line
```

## Migration Notes

- Local migration deploy previously had trouble because of an older local failed migration state.
- For local development, `npx prisma db push` was used successfully after schema changes.
- CI/production should use committed Prisma migrations.
- Earlier production-like failures involved:
  - `pg_graphql` extension unavailable in baseline migration.
  - `0002_trust_marketplace_foundation` failing when baseline tables were absent.
- Be careful with Prisma schema relation integrity. `AGENTS.md` warns that external generated changes may destabilize relation names or defaults.

## Next Sensible Workstreams

Recommended next implementation areas:

1. Command center payment evidence panel
   - Add a compact payment state summary at the top of the milestone tab.
   - Show client total paid, platform fee, facilitator payout, latest Stripe IDs, and release attestation in one scannable panel.

2. Facilitator wallet view
   - Add Playwright coverage for facilitator wallet funded/submitted/paid states.
   - Confirm "Submit delivery evidence" deep-links correctly from wallet to milestone.

3. Integration-to-verification flow
   - Build a clearer project-level setup flow for evidence integrations.
   - Distinguish client-owned access, facilitator-owned access, and manual evidence.
   - Tie integration strength to bid confidence and milestone verification.

4. Settings cleanup
   - Settings is crowded.
   - Move verification and proof capability setup into a clearer Account/Profile or Trust Profile surface.
   - Keep payments/security/preferences separate.

5. Buyer scope refinement loop
   - Continue improving the SOW builder as a guided loop:
     - rough idea
     - AI questions
     - revised constraints
     - milestone draft
     - quality issues
     - user revision
     - final scope
   - Budget/timeline should stay explicit fields, not inferred from text alone.

6. Production readiness
   - Keep validating `npm run build`.
   - Avoid relying on ignored TypeScript/build errors.
   - Review migration status before Vercel deploys against Supabase.

## Starter Prompt For New Session

Paste this into the new Codex session:

```text
We are continuing the Untether implementation in D:\beuntethered. Please read AGENTS.md and SESSION_HANDOFF.md first. The product is a trust-first, AI-assisted software delivery marketplace with verified milestone escrow, evidence integrations, and enterprise-ready UI. Do not revert unrelated dirty scratch files. Recent pushed commit is 50253e5 feat: deep link wallet milestone actions. Continue from the next sensible workstream in SESSION_HANDOFF.md, preferably command center payment evidence or facilitator wallet coverage, and keep running focused tests plus tsc/lint/build before committing.
```
