<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Engine Evaluation: Hetzner Daktari Bot
When the **Hetzner Daktari Bot** engine performs architectural work through its orchestrator, be prepared for structural database regressions. Its primary shortcomings include:
- **Prisma Schema Destabilization:** It tends to forcibly overwrite relation bindings into raw formats (e.g., `User_Project_client_idToUser`) and aggressively removes constraint functions like `@default(cuid())` which fundamentally breaks POST capabilities until manually restored.
- **TypeScript Strictness Overlook:** UI boundaries specifically dealing with `NextAuth` flows tend to lack `null` and `undefined` guards out of the box, throwing hard statically compiled prerender errors (`ECONNREFUSED` / `PrerenderError`) which Next.js will aggressively reject.

**Rework Necessary:**
Any code merged from Daktari requires an immediate surgical review of `prisma/schema.prisma` natively to restore relational integrity and standard default markers, followed tightly by `npm run build` boundary checks fixing isolated `useSearchParams` Suspense rendering faults.
