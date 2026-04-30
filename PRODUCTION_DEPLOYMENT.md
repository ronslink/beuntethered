# Production Deployment

Untether production runs on Vercel with Supabase Postgres. Vercel is the source of truth for production environment variables.

## Production Rules

- Keep `.env.local` local-only. Do not commit env files or production secrets.
- Vercel build must not mutate Supabase. The current build command is `prisma generate && next build`.
- Apply database changes intentionally with Prisma migrations before or during a controlled release.
- Use `prisma migrate deploy` for production Supabase, not `prisma db push`.
- Keep Stripe, Resend, Groq/Gemma, Blob, auth, and cron secrets in Vercel project environment settings.

## Preflight

Run local code checks:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run secrets:scan
```

Run the production readiness helper:

```bash
npm run deploy:check
```

If you have pulled Vercel env vars into the current shell and want env enforcement:

```bash
npm run deploy:check:strict
```

## Supabase Migration Flow

Confirm pending migrations locally:

```bash
npx prisma migrate status
```

Apply migrations to the target Supabase database intentionally:

```bash
npx prisma migrate deploy
```

Do this only with `DATABASE_URL` pointing at the intended Supabase environment. Avoid running `prisma db push` against production.

## Vercel Environment Variables

Configure these in Vercel for Production, Preview, and Development as appropriate:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `ENCRYPTION_MASTER_KEY`
- `INTERNAL_API_SECRET`
- `CRON_SECRET`
- `ADMIN_EMAIL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `AI_BASIC_PROVIDER`
- `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL` when `AI_BASIC_PROVIDER=groq`
- `GEMMA_BASE_URL`, `GEMMA_MODEL`, `GEMMA_API_KEY` when using the self-hosted Gemma lane
- `MINIMAX_API_KEY`, `MINIMAX_BASE_URL` when using MiniMax
- `RESEND_API_KEY`, `EMAIL_FROM` for transactional email
- `GITHUB_ID`, `GITHUB_SECRET`, `GITHUB_WEBHOOK_SECRET` for GitHub integration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google OAuth

## Webhooks And Cron

Stripe webhook endpoint:

```text
https://<production-domain>/api/webhooks/stripe
```

GitHub webhook endpoint:

```text
https://<production-domain>/api/webhooks/github
```

The Vercel cron in `vercel.json` calls:

```text
/api/alerts/saved-searches
```

That route requires `Authorization: Bearer $CRON_SECRET`.

## Release Order

1. Confirm the target Vercel environment variables are set.
2. Run tests and build locally.
3. Run `npm run deploy:check`.
4. Apply Supabase migrations with `npx prisma migrate deploy`.
5. Deploy to Vercel.
6. Smoke test login, BYOC invite creation, BYOC claim, command center, funding checkout, Stripe webhook, and saved-search cron.
