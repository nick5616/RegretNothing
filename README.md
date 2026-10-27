# RegretNothing

Reduce senseless spending and help people give better gifts.

Share one link that shows what you'd love **and what you already have**. Gifters claim items or chip in on big ones. You never see who got what.

## Run it

```sh
npm install
npm run dev        # http://localhost:3000
```

There's nothing else to set up. Without `DATABASE_URL`, the app uses an embedded Postgres (PGlite) stored in `./.data/pglite` and migrates it on first request. Delete that folder to start fresh.

```sh
npm test           # vitest: domain rules + link unfurling
npm run typecheck
npm run build && npm start
```

Node 20.9+ works. Node 20 is past end-of-life, so use Node 24 LTS.

## Production

1. Create a Postgres database (Neon, Supabase, RDS…) and set `DATABASE_URL`.
2. Set `APP_URL` to the public origin, e.g. `https://regretnothing.com`.
3. Run `npm run db:migrate`, then `npm run build && npm start`. Any Node host works, including Vercel.

## Layout

| Path | What |
| --- | --- |
| `src/lib/gifts.ts` | Domain rules: accounts, items, claims, pledges, and the owner-blind public view |
| `src/lib/auth.ts` / `session.ts` | scrypt passwords, hashed session tokens, anonymous gifter cookie |
| `src/lib/unfurl.ts` | Paste-a-link metadata (JSON-LD → Open Graph → `<title>`), with SSRF guards |
| `src/lib/db/` | Drizzle schema; `getDb()` picks Postgres or PGlite |
| `drizzle/` | SQL migrations (`npm run db:generate` after editing the schema) |
| `src/app/` | Next.js App Router pages and server actions |

The original Create.xyz prototype (Expo app + React Router API) lives in git history at `900d2ed`.
