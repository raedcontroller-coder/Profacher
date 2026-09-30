# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Profacher 2.0 is an AI-assisted exam platform (Next.js 16 App Router) for Brazilian schools,
faculdades, and independent teachers. It grades multiple-choice, essay/dissertação, and
handwritten math questions with OpenAI, runs live-monitored digital exams (Pusher realtime),
and corrects photographed physical exams against a gabarito. The actual app lives entirely
under `web/` — the repo root only holds docs, media, and sales/spec material.

## Commands

All commands run from `web/`, not the repo root (there is no root `package.json`).

```bash
npm run dev          # Next dev server (localhost:3000)
npm run build        # production build (also run this to catch Prisma/SSG issues, see below)
npm run lint
npm test             # vitest run (unit tests, jsdom)
npm run test:watch   # vitest watch mode
npx vitest run path/to/file.test.ts   # single unit test file
npm run test:e2e     # playwright (see "E2E tests" below — most specs need manual setup first)
npx prisma db push   # apply schema.prisma changes to the DB (this project has NO migrations/ folder — push-based, not `prisma migrate`)
npx prisma generate  # regenerate the client after any schema.prisma change
npx ts-node prisma/seed.ts   # seed roles + Plan rows (Start/Turbo/Ultra/VIP)
```

**After any `schema.prisma` edit**: run `prisma generate`. If the dev server is running on
Windows, `prisma generate` can fail with `EPERM` because the query engine `.dll` is locked by
the running Next process — stop `npm run dev` first, generate, then restart it. Never kill a
dev server process without checking whether it's the user's own already-running one.

### Local database access

There is no local Postgres. `DATABASE_URL` in `web/.env` points at `127.0.0.1:5433`, which only
works with an SSH tunnel open in a separate terminal:

```powershell
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -L 5433:10.0.1.7:5432 root@62.171.175.197
```

If it drops (common), `npm run dev` starts fine but every DB-backed request fails with
`Can't reach database server at 127.0.0.1:5433`. See `web/CONEXAO_BANCO.md` for more recovery
steps (stale `.env`, changed internal IP after a Coolify restart, etc.). `web/.env.hml` holds a
second, separately-reachable connection to the same physical HML database via a public port —
used by the Playwright E2E suite's `.env.hml`-derived credentials, not by local `npm run dev`.

### E2E tests (`web/tests/e2e/`)

`playwright.config.ts` defaults `baseURL` to the deployed HML site; override with
`PLAYWRIGHT_BASE_URL=http://localhost:3000` to run against a local dev server instead. Specs
that create/delete real data instantiate their own `PrismaClient` and always clean up in a
`finally` block — follow that pattern for any new spec (generate unique emails, delete
everything created, never touch pre-existing manually-created test accounts). Some specs have
extra manual prerequisites documented in their own header comment, e.g.
`payment-checkout.spec.ts` needs `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` in `.env` *and* a
`stripe listen --forward-to localhost:3000/api/webhooks/stripe` process running in another
terminal so the real webhook round-trip can be exercised locally.

For quick one-off manual verification (not permanent tests), the convention this session is a
throwaway script in `web/scratch/*.mjs` (Prisma + Playwright, run with plain `node`) — it is not
gitignored, so delete it (and any test data it created) before finishing.

## Architecture

### Multi-tenancy: Account vs Institution vs User

Every paying entity is an `Account` (`type: INSTITUTION | INDIVIDUAL`) with one `Subscription`.
- An `Institution` always has an `Account` (1:1) and pays via its own OpenAI key or the global
  key — institutions are **never** credit-metered.
- An independent professor's `User.accountId` points directly at their own `Account` (no
  `Institution`); `User.institutionId` and `User.accountId` are mutually exclusive (enforced by
  a DB check constraint, not just app logic).
- Only `INDIVIDUAL` accounts consume credits per correction (`lib/ai/credits.ts`,
  `consumeCredits`) — this is an explicit business rule, checked redundantly at both the
  credit-deduction layer and admin-action layer (`account.type !== "INDIVIDUAL"` guards). A
  `Subscription.creditsRemaining === null` means unlimited (VIP plan, or institution) and is
  never decremented.
- `Plan` (Start/Turbo/Ultra/VIP) rows hold `stripePriceId`, editable from `/admin/accounts` —
  Stripe stays inert (`lib/stripe.ts`) until `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` are set;
  without them, choosing a paid plan grants a provisional `PENDING_PAYMENT` subscription instead
  of redirecting to a real Stripe Checkout session.

### AI routing

`lib/ai/account.ts` (`resolveAiConfigForUser`) is the single place that decides which OpenAI key
and model to use for a given user — global admin or an institution with `hasIntegratedAi` use
`GlobalSettings`' key (with an optional fallback key/model also stored there); everyone else
(independent professor, or institution with its own key) uses their `Account.customAiKey`.
`app/actions/aiAction.ts` (`generateMathEquation`, `gradeStudentAnswer`, `gradePhysicalExam`) is
where corrections actually happen; `gradeStudentAnswer` and `gradePhysicalExam` call
`consumeCredits` before grading (1 credit per dissertação/math answer, `max(1, photos.length)`
for a physical exam) — `generateMathEquation` does not (it's an authoring aid, not a correction).

### Exam lifecycle & realtime

`app/professor/exams/actions.ts` is the largest/most central file: exam CRUD, `startExamLive`/
`stopExamLive`, live question delivery (`getLiveExamQuestions`), answer autosave
(`saveLiveAnswer`), and grading on submit (`finishExamLive`). Live monitoring (who's online, who
lost focus/fullscreen, kicking a student) is pushed over Pusher (`lib/pusher.ts`) rather than
polled.

The actual student-facing exam UI is `app/prova/page.tsx` (a single large client component
driving a join → live → review → finish state machine, entirely via server actions from
`professor/exams/actions.ts`) — **not** `app/prova/[code]/page.tsx`, which only renders a
waiting-room animation and never fetches questions. Students never authenticate via NextAuth;
they join with name + RA + a 5-character exam access code.

**Security invariant**: nothing sent to the student's browser before or during the exam may
reveal the answer key. `getLiveExamQuestions` explicitly selects only `{id, content}` for
options (never `isCorrect`), and `finishExamLive` strips `correctAnswer`/`tfResult` (and
rewrites any feedback text that would embed the answer) from its response whenever
`exam.showScore` is false — the DB copy (`ExamSubmission.correctionDetails`) keeps the full
detail for the professor. Preserve this whenever touching either function.

### Auth & roles

NextAuth v5 (`auth.ts`/`auth.config.ts`), Credentials provider, JWT sessions. Roles are
`ADMIN`/`COORDINATOR`/`PROFESSOR` (`lib/roles.ts`) — check role via `ROLES.X`, not a raw string.
`authorize()` also gates independent professors (role `PROFESSOR` with `accountId` set) behind
`emailVerifiedAt` — institution-affiliated users are never subject to this (their invite-accept
flow already proves the email). `middleware.ts` redirects any non-public, non-authenticated
request to `/login`; public routes are matched by exact/prefix checks in `isPublicPage` (`/`,
`/prova`, `/register`, `/verify-email`) — a new public route needs both this check *and* an
entry in the `config.matcher` negative-lookahead if it's a static asset (see `blink.jpg`,
`bg.png`).

### Design system

Dark-by-default CSS custom properties in `app/globals.css` (`:root` = dark values, `.light`
class overrides them) plus a `.liquid-glass` utility (translucent, blurred cards) used
throughout instead of plain borders/shadows. Prefer `border-black/5 dark:border-white/[0.02]`
for subtle borders — a bare `border-primary/NN` renders as a harsh visible line and has been
swept out of the codebase already; don't reintroduce it. Material Symbols (not an icon library
import) for icons, Inter for all text including the "Profacher" wordmark (no separate logotype
font is actually loaded, despite an `'Outfit', 'Inter'` reference in the email templates in
`lib/email.ts` — `Outfit` is never loaded anywhere, so it silently falls back to Inter).

### Deployment (Coolify, `web/Dockerfile`)

Multi-stage build (`deps` → `builder` → `runner`). Two known failure modes, both already fixed
once and worth remembering before they resurface:
- `npm ci` needs `--legacy-peer-deps` (a `next-auth`/`nodemailer` peer conflict).
- Any page/route that queries Prisma in a Server Component **and isn't already forced dynamic**
  (e.g. by calling `auth()`/`cookies()`) will get statically prerendered by `next build`, which
  runs inside the Docker build stage where the Prisma engine's OpenSSL target can mismatch and
  throw `PrismaClientInitializationError`, failing the whole deploy. Add
  `export const dynamic = 'force-dynamic'` to any new Server Component that fetches from Prisma
  and has no other dynamic API call already forcing that — `npm run build` locally reproduces
  this exactly and is the fast way to catch it before pushing.

## Git workflow

Per `.agents/AGENTS.md`: all development and testing happens on `releasecandidate`. Never
commit, push, or otherwise change `main` directly — merge `releasecandidate` into `main` only,
and only when asked. E2E tests must run against the HML database/bucket, never anything else;
`web/.env.hml` (HML credentials) must stay gitignored and is never committed.
