# TradeLog — Intelligent Trading Journal

A **self-hosted, single-user** trading journal. One installation, one trader, one SQLite database on your machine (or in Docker). There is no multi-tenant cloud backend — you own the data.

Automatic risk math, multi-account profiles, chart screenshots, and optional AI coaching (Claude, OpenAI, or Gemini).

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

## Single-user design

TradeLog is built for **one person on one instance**:

- All trades, settings, and API keys live in your local SQLite database
- No shared accounts, teams, or hosted SaaS layer
- Optional login protects access on a shared server; by default the app opens without sign-in (fine for personal laptops)
- Back up `prisma/dev.db` (or the Docker `sqlite-data` volume) to preserve your journal

## Prerequisites

- Node.js 20+
- npm

## Install (local)

```bash
git clone git@github.com:akgcybersec/TradeLog.git
cd TradeLog

npm install
cp .env.example .env
```

Edit `.env` and set `SESSION_SECRET` to a random string of at least 32 characters (required if you enable login):

```bash
openssl rand -base64 32
```

Apply the database schema and start the dev server:

```bash
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build (without Docker)

```bash
npm install
cp .env.example .env   # if not done yet — set SESSION_SECRET
npm run db:push
npm run build
npm start
```

Use a plain `npm install` (not `--omit=dev`) so TypeScript types and ESLint stay available if you rebuild later.

## Install (Docker)

```bash
git clone git@github.com:akgcybersec/TradeLog.git
cd TradeLog

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

## How to use

### First launch

1. Open the app — no login required by default
2. Go to **Settings** and set your timezone, default instrument, and risk preferences
3. (Optional) Add **Trading profiles** for each broker account you track
4. (Optional) Add an AI provider API key under **Settings → AI** and verify the connection

### Log a trade

1. **New trade** from the sidebar (or dashboard)
2. Pick instrument, direction, entry, stop loss, and take profit(s)
3. Attach chart screenshots if you want
4. Save — risk metrics (R:R, position size, exposure) update as you type

### While a trade is open

- View it on the **Dashboard** or **History**
- Request an **AI setup review** (if AI is configured) for a second opinion before you hold or exit

### Close a trade

1. Open the trade and enter exit price, outcome (hit SL, TP1, etc.), and realized P/L
2. Add a **post-trade impression** (what you learned)
3. AI can generate a **coach review** on close when configured

### Review performance

- **Dashboard** — calendar, equity curve, filters by profile/symbol/session
- **History** — search and paginate past trades; expand a row for notes and AI feedback
- **Insights** — periodic AI summary of trends (uses compact snapshots to limit token use)

### Optional login

- **Settings → Access & Login → Require login** — when you turn this on, you first create the single app account (email + password), then login is enabled and you are sent to the sign-in page
- If an account already exists, enabling login takes you straight to `/login`
- Use HTTPS behind a reverse proxy if exposing the app on a network

## Environment variables

Copy `.env.example` to `.env`. **Never commit `.env`** — it is gitignored.

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | When login is enabled | Random string, min 32 characters |
| `DATABASE_URL` | Optional | Defaults to `file:./prisma/dev.db` (SQLite) |
| `COOKIE_SECURE` | HTTP / LAN access | Set `false` for `http://192.168.x.x` — otherwise login cookies are blocked |
| `APP_PORT` | Docker only | Host port (default `3000`) |

**AI and market-data API keys** are configured in the app under **Settings**, stored in your local database — not in `.env` and not in this repository.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run db:reset` | Delete local DB and recreate empty schema |
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

## Reset / start fresh

Stop the app, then:

```bash
npm run db:reset
```

This deletes the SQLite file and reapplies an empty schema (all trades, settings, login account, and API keys in Settings are removed). Restart with `npm start`.

Docker: `docker compose down -v` removes database and upload volumes, then `docker compose up --build -d`.

## Login blank page over HTTP?

If you open the app as `http://192.168.x.x:3000` with login enabled, add to `.env`:

```bash
COOKIE_SECURE=false
```

Restart the app. Browsers refuse secure session cookies on plain HTTP, so sign-in looks successful but the session is never saved.

## Tech stack

- Next.js 16 (App Router)
- TypeScript, Tailwind CSS v4
- Prisma 7 + SQLite
- iron-session authentication
