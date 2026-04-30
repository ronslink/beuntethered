# Security Notes

## API Keys And Git History

Never commit provider keys, webhook secrets, OAuth secrets, Stripe keys, or local `.env` files. Use `.env.local` for local development and production environment variables in the hosting provider.

Before committing, run:

```bash
npm run secrets:scan
```

If a real key was ever committed, rotate it first. After rotation, remove the file from current `main`; if the repository must be fully purged, use a coordinated history rewrite and force-push only after everyone using the repository is aware.
