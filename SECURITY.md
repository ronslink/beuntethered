# Security Notes

## API Keys And Git History

Never commit provider keys, webhook secrets, OAuth secrets, Stripe keys, or local `.env` files. Use `.env.local` for local development and production environment variables in the hosting provider.

Before committing, run:

```bash
npm run secrets:scan
```

To scan all currently tracked files, run:

```bash
npm run secrets:scan:tracked
```

To scan a specific Git diff range, run:

```bash
npm run secrets:scan:range -- origin/main...HEAD
```

At the time this guard was added, `secrets:scan:tracked` is expected to flag legacy scratch files until the exposed keys are rotated and those files are purged from the repository.

If a real key was ever committed, rotate it first. After rotation, remove the file from current `main`; if the repository must be fully purged, use a coordinated history rewrite and force-push only after everyone using the repository is aware.
