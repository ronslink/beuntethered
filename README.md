# Untether

Untether is a human-led, AI-assisted software delivery marketplace for verified, milestone-based work. The local environment is set up for the enterprise-readiness release: trust records, attachments, activity logs, escrow state, Stripe reconciliation, and Playwright smoke tests.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

The default local app URL is `http://127.0.0.1:3200`. Port `3000` is intentionally avoided because it is commonly occupied by other local apps.

Start Postgres with pgvector:

```bash
npm run db:up
npm run db:init
npm run db:migrate
```

For local development, `npm run db:migrate` intentionally runs a guarded `prisma db push`.
The historical Prisma migration folder is retained for production/Supabase baseline and
deploy workflows; a fresh local Docker database should not replay the Supabase baseline
migrations directly.

Production/Supabase deploys use `npm run db:migrate:deploy`. If a database previously
failed on the old `0002_trust_marketplace_foundation` migration before any real data
was created, reset the empty schema once, then rerun deploy:

```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
```

Then run:

```bash
npm run db:migrate:deploy
```

If deploy still reports `New migrations cannot be applied before the error is recovered from`,
inspect the target database migration ledger first:

```bash
npm run db:migrations:status
```

The current repository contains a single production baseline migration:
`0001_current_schema`. If Supabase/Vercel is still blocked by older failed rows such
as `0001_baseline` or `0002_trust_marketplace_foundation`, resolve only the failed
rows in that target database, then rerun deploy:

```bash
npx prisma migrate resolve --rolled-back 0001_baseline
npx prisma migrate resolve --rolled-back 0002_trust_marketplace_foundation
npm run db:migrate:deploy
```

Do not reset a production schema that contains real users, projects, bids, payments,
or audit records. Use the schema reset above only for an empty failed preview/prototype
database.

If the target database already has the expected tables from older applied migrations
and `0001_current_schema` is pending, verify the schema first, then mark the current
baseline as applied instead of replaying it over existing tables:

```bash
npm run db:migrations:status
npx prisma migrate resolve --applied 0001_current_schema
npm run db:migrate:deploy
```

Run the dev server:

```bash
npm run dev:local
```

Open [http://127.0.0.1:3200](http://127.0.0.1:3200).

## Required Environment

Core local variables:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5433/beuntethered_local?schema=public"
NEXTAUTH_URL="http://127.0.0.1:3200"
NEXTAUTH_SECRET="..."
ENCRYPTION_MASTER_KEY="..."
INTERNAL_API_SECRET="..."
CRON_SECRET="..."
```

Payments:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

Attachments:

```bash
BLOB_READ_WRITE_TOKEN="..."
```

When `BLOB_READ_WRITE_TOKEN` is blank, fake, or `test_token...`, local uploads use the built-in `https://local.blob/...` fallback so tests do not call Vercel Blob.

AI providers:

```bash
OPENAI_API_KEY="..."
MINIMAX_API_KEY="..."
MINIMAX_BASE_URL="https://api.minimax.io/v1"
AI_BASIC_PROVIDER="groq" # groq, gemma-4-server, or minimax
GROQ_API_KEY=""
GROQ_BASE_URL="https://api.groq.com/openai/v1"
GROQ_MODEL="llama-3.1-8b-instant"
GEMMA_BASE_URL="" # optional OpenAI-compatible self-hosted Gemma endpoint
GEMMA_MODEL="gemma-4-26b-it"
GEMMA_API_KEY=""
```

Optional integrations:

```bash
RESEND_API_KEY="..."
GITHUB_ID="..."
GITHUB_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Notes:

- `@ai-sdk/google` is installed for Gemini BYOK routing.
- The basic AI lane is task routed. Prompt triage, classification, normalization, and summaries can use Groq or self-hosted Gemma; SOW generation, milestone audits, dispute review, bid scoring, and payment-sensitive work stay on the trusted default/BYOK lane.
- Self-hosted Gemma runs through `GEMMA_BASE_URL`, so it does not require `@ai-sdk/google`.
- SMS is not part of this release. Africa's Talking is intentionally not wired.
- Firebase web push is not configured. The current notification channel is in-app notifications plus Resend email.

## Platform Admin Bootstrap

Admin access is granted by matching the configured `ADMIN_EMAIL`; there is no separate `ADMIN` user role. After setting `ADMIN_EMAIL`, ensure the account exists so arbitration, verification, and readiness notifications have a real inbox:

```bash
ADMIN_BOOTSTRAP_PASSWORD="use-a-long-temporary-password" npm run admin:ensure
```

The script creates the admin user if missing, marks onboarding complete, and refreshes the password only when `ADMIN_BOOTSTRAP_PASSWORD` is provided.

## Stripe Webhooks

For repeatable local CI coverage, Playwright injects a test webhook secret and sends Stripe-compatible signed payloads to `/api/webhooks/stripe`.

Covered by `npm run test:e2e`:

- duplicate `checkout.session.completed` funding remains idempotent
- `checkout.session.expired` cancels pending funding records
- `payment_intent.succeeded` can fund direct PaymentIntent flows
- `transfer.created` reconciles escrow release records
- the buyer/facilitator delivery smoke verifies submit -> audit -> approve/pay

For a live Stripe CLI tunnel, install the Stripe CLI, then run:

```bash
stripe listen --forward-to 127.0.0.1:3200/api/webhooks/stripe
```

Copy the emitted `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart the dev server.

## Saved Search Alerts

The Vercel cron in `vercel.json` invokes `/api/alerts/saved-searches` daily at 13:00 UTC.

Run it locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3200/api/alerts/saved-searches
```

## Verification

Run these before merging or deploying:

```bash
npm run deploy:check
npm run verify
```

Current smoke coverage includes registration, public positioning, project creation, facilitator trust profiles, invite-to-bid, bid comparison, settings/payment readiness, activity logs, Stripe webhook reconciliation, and the full delivery lifecycle.

For production Vercel + Supabase deployment, see [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md). Production database changes should use `npm run db:migrate:deploy` with `DATABASE_URL` pointed at the intended Supabase environment. Do not use `prisma db push` against production.

## Vercel Checklist

Set these in Vercel for production:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_MASTER_KEY`
- `INTERNAL_API_SECRET`
- `CRON_SECRET`
- `ADMIN_EMAIL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `BLOB_READ_WRITE_TOKEN`
- AI provider keys required for enabled providers
- `AI_BASIC_PROVIDER`, `GROQ_API_KEY`, `GROQ_BASE_URL`, and `GROQ_MODEL` when using Groq for the basic task lane
- `GEMMA_BASE_URL`, `GEMMA_MODEL`, and `GEMMA_API_KEY` only when enabling the self-hosted Gemma route
- Optional OAuth and Resend keys

The Stripe webhook endpoint should point to:

```text
https://<production-domain>/api/webhooks/stripe
```
