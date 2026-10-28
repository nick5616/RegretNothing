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

Live at https://regretnothing.netlify.app: Netlify (Free plan) with a Neon Postgres database (Free plan, project `wispy-hill-70217167`, us-east-2).

- `netlify.toml` runs `npm run db:migrate` before every build, so tables never lag the code.
- Netlify env: `DATABASE_URL` (Neon's pooled connection string, production and preview contexts only) and `APP_URL`.
- Email (password resets, gift receipts) goes out through `SMTP_URL`, e.g. `smtps://you%40gmail.com:APP-PASSWORD@smtp.gmail.com:465` with a Gmail app password, or Resend's SMTP once there's a domain. `MAIL_FROM` overrides the sender. Without it, nothing is sent: locally the message prints to the server console, and receipts tell gifters to bookmark the page instead.
- Without `DATABASE_URL`, both the build and the app refuse to run on Netlify rather than fall back to PGlite on a disk that vanishes.
- Deploy by pushing once the GitHub repo is linked in Netlify. `netlify deploy --build --prod` also works from macOS, Linux or WSL, but not from plain Windows: the Next.js plugin creates symlinks that Windows blocks without Developer Mode.

Any other Node host works too: set `DATABASE_URL` and `APP_URL`, run `npm run db:migrate`, then `npm run build && npm start`.

## Layout

| Path | What |
| --- | --- |
| `src/lib/gifts.ts` | Domain rules: accounts, items, claims, pledges, receipts, and the owner-blind public view |
| `src/app/thanks/[id]` | The gift receipt a gifter lands on after claiming or chipping in. Its link is the key to change the gift from any device |
| `src/lib/rateLimit.ts` / `mail.ts` | Postgres-backed rate limits; SMTP email |
| `src/lib/auth.ts` / `session.ts` | scrypt passwords, hashed session tokens, anonymous gifter cookie |
| `src/lib/unfurl.ts` | Paste-a-link metadata (JSON-LD → Open Graph → `<title>`), with SSRF guards |
| `src/lib/db/` | Drizzle schema; `getDb()` picks Postgres or PGlite |
| `drizzle/` | SQL migrations (`npm run db:generate` after editing the schema) |
| `src/app/` | Next.js App Router pages and server actions |

The original Create.xyz prototype (Expo app + React Router API) lives in git history at `900d2ed`.
