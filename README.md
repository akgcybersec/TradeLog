# TradeLog — Intelligent Trading Journal

A self-hosted trading journal with automatic risk math, multi-account profiles, chart screenshots, and AI coaching (Claude, OpenAI, or Gemini).

## Features

- **Trade entry** — Instrument, direction, entry/SL/TP, position size, notes, screenshots
- **Live risk metrics** — R:R, pip distance, potential P/L, exposure as you type
- **Multiple take profits** — TP1, TP2, TP3+ with exit-outcome selection (SL / TP / custom)
- **Trading profiles** — Separate broker accounts, balance from closed trades, risk-based sizing
- **Dashboard** — Calendar, equity curve, session/symbol performance, filters
- **History** — Paginated trade list, lazy-loaded AI reviews, search and filters
- **AI coaching** — Setup opinion (open trades), coach review (closed trades), historical insights
- **Optional login** — Use without sign-in, or require login from Settings
- **Mobile-friendly** — Responsive layout with collapsible navigation
- **Docker** — Production image with persistent SQLite and uploads

## Prerequisites

- Node.js 20+
- npm

## Quick Start (local)

```bash
npm install
cp .env.example .env
# Edit .env — set SESSION_SECRET (min 32 characters) if you enable login

npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default, **login is not required**. Enable it under **Settings → Access & Login** if you want a sign-in page.

## Environment variables

Copy `.env.example` to `.env`. **Never commit `.env`** — it is gitignored.

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | When login is enabled | Random string, min 32 characters |
| `DATABASE_URL` | Optional | Defaults to `file:./prisma/dev.db` (SQLite) |
| `APP_PORT` | Docker only | Host port (default `3000`) |

**AI and market-data API keys** are configured in the app under **Settings**, stored in your local database — not in `.env` and not in this repository.

## AI setup

1. Open **Settings**
2. Choose provider (Anthropic, OpenAI, or Gemini)
3. Enter your API key and verify
4. Closed trades can receive automatic AI review when configured

## Docker (production)

```bash
cp .env.example .env
# Set SESSION_SECRET in .env

docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000).

```bash
docker compose logs -f app    # follow logs
docker compose down           # stop
docker compose down -v        # stop and remove DB + upload volumes
```

Data persists in Docker volumes `sqlite-data` and `upload-data`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | ESLint |

## Project structure

```
src/
  app/              Pages and API routes
  components/       UI (trade form, dashboard, AI displays, layout)
  lib/              Calculations, AI, profiles, auth
  hooks/            Shared React hooks
prisma/
  schema.prisma     Database schema
```

## Security

- Do **not** commit `.env`, database files (`*.db`), or uploaded screenshots
- API keys belong in **Settings** inside the running app, or in your private `.env` for `SESSION_SECRET` only
- Enable **Require login** in Settings before exposing the app on a public network
- Use HTTPS (reverse proxy) in production

## Tech stack

- Next.js 16 (App Router)
- TypeScript, Tailwind CSS v4
- Prisma 7 + SQLite
- iron-session authentication
