# Poker Nights

A mobile-first PWA for tracking weekly home-game buy-ins, cash-outs, and lifetime stats.

## What it does

- Magic-link sign-in (no passwords) — host pre-creates the roster, players sign in by entering their email
- Each player records their own buy-ins (rebuys allowed) and cash-out
- Session can&apos;t be finalized until total buy-ins equal total cash-outs (auto-balance check)
- Auto-computes the minimal "X pays Y $Z" settlement after the night
- Lifetime stats per player + all-time leaderboard + "Biggest Donkey" call-out
- Web push notifications: Monday 8pm reminder + "GAME LIVE" blast when the host taps Go
- Admin (host) panel: roster management, session management, per-session approver delegation

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + magic-link auth) — free tier
- Vercel (hosting + cron) — free tier
- Web Push API for notifications
- Zero monthly cost for ~30 players

## Getting started

See [DEPLOY.md](./DEPLOY.md) for the click-by-click deployment guide.

## Local development

```bash
npm install
cp .env.example .env.local      # fill in Supabase + VAPID keys
npm run gen:vapid               # if you need new VAPID keys
npm run dev
```
