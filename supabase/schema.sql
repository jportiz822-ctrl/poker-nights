-- Poker Nights schema
-- Paste this whole file into Supabase Dashboard > SQL Editor > New query > Run.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ============================================================================
-- PLAYERS
-- ============================================================================
-- One row per crew member. `auth_user_id` links to Supabase auth.users when
-- the player has logged in. Admins (host) can pre-create players without an
-- account so they show up in stats before they sign in for the first time.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  display_name text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  joined_at timestamptz not null default now()
);

create index if not exists players_auth_user_id_idx on public.players(auth_user_id);

-- ============================================================================
-- SESSIONS
-- ============================================================================
-- One row per poker night. Status transitions:
--   scheduled -> live -> pending_approval -> finalized
--   any -> canceled

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  played_on date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','live','pending_approval','finalized','canceled')),
  created_by uuid references public.players(id),
  approver_id uuid references public.players(id), -- defaults to host; can be delegated per-session
  approved_by uuid references public.players(id),
  approved_at timestamptz,
  went_live_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sessions_played_on_idx on public.sessions(played_on desc);
create index if not exists sessions_status_idx on public.sessions(status);

-- ============================================================================
-- SESSION ENTRIES (buy-ins and cash-outs)
-- ============================================================================
-- Multiple buy-ins per player per session are allowed (rebuys).
-- Typically one cash-out per player per session, but we don't hard-enforce it.

create table if not exists public.session_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id),
  kind text not null check (kind in ('buy_in','cash_out')),
  amount_cents integer not null check (amount_cents > 0),
  recorded_by uuid references public.players(id),
  created_at timestamptz not null default now()
);

create index if not exists entries_session_idx on public.session_entries(session_id);
create index if not exists entries_player_idx on public.session_entries(player_id);

-- ============================================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================================
-- One row per device a player has installed the PWA on.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_player_idx on public.push_subscriptions(player_id);

-- ============================================================================
-- VIEWS — convenient aggregates for stats pages
-- ============================================================================

-- Per-player, per-session net (cash_out total - buy_in total).
create or replace view public.player_session_nets as
select
  e.session_id,
  s.played_on,
  s.status,
  e.player_id,
  sum(case when e.kind = 'buy_in'   then e.amount_cents else 0 end)::int as buy_in_cents,
  sum(case when e.kind = 'cash_out' then e.amount_cents else 0 end)::int as cash_out_cents,
  (sum(case when e.kind = 'cash_out' then e.amount_cents else 0 end)
   - sum(case when e.kind = 'buy_in' then e.amount_cents else 0 end))::int as net_cents
from public.session_entries e
join public.sessions s on s.id = e.session_id
group by e.session_id, s.played_on, s.status, e.player_id;

-- Per-session totals (used to verify session balances to zero).
create or replace view public.session_totals as
select
  s.id as session_id,
  s.played_on,
  s.status,
  coalesce(sum(case when e.kind='buy_in' then e.amount_cents else 0 end), 0)::int as total_buy_in_cents,
  coalesce(sum(case when e.kind='cash_out' then e.amount_cents else 0 end), 0)::int as total_cash_out_cents,
  coalesce(sum(case when e.kind='cash_out' then e.amount_cents else 0 end)
         - sum(case when e.kind='buy_in'   then e.amount_cents else 0 end), 0)::int as imbalance_cents,
  count(distinct e.player_id) as player_count
from public.sessions s
left join public.session_entries e on e.session_id = s.id
group by s.id, s.played_on, s.status;

-- Lifetime stats per player (only counts FINALIZED sessions).
create or replace view public.player_lifetime_stats as
select
  p.id as player_id,
  p.display_name,
  count(distinct n.session_id)::int as sessions_played,
  coalesce(sum(n.net_cents), 0)::int as net_cents,
  coalesce(max(n.net_cents), 0)::int as biggest_win_cents,
  coalesce(min(n.net_cents), 0)::int as biggest_loss_cents,
  coalesce(sum(n.buy_in_cents), 0)::int as total_buy_in_cents
from public.players p
left join public.player_session_nets n
  on n.player_id = p.id and n.status = 'finalized'
group by p.id, p.display_name;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.players          enable row level security;
alter table public.sessions         enable row level security;
alter table public.session_entries  enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: is the current auth user an admin?
create or replace function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where auth_user_id = auth.uid() and is_admin = true and is_active = true
  );
$$;

-- Helper: player_id of the current auth user
create or replace function public.current_player_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select id from public.players where auth_user_id = auth.uid() limit 1;
$$;

-- ---- players ----
drop policy if exists "players are readable by authenticated" on public.players;
create policy "players are readable by authenticated" on public.players
  for select to authenticated using (true);

drop policy if exists "players self-update display_name" on public.players;
create policy "players self-update display_name" on public.players
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Inserts/admin updates/deletes go through the service role from API routes.

-- ---- sessions ----
drop policy if exists "sessions are readable by authenticated" on public.sessions;
create policy "sessions are readable by authenticated" on public.sessions
  for select to authenticated using (true);

-- Mutations go through API routes using the service role.

-- ---- session_entries ----
drop policy if exists "entries are readable by authenticated" on public.session_entries;
create policy "entries are readable by authenticated" on public.session_entries
  for select to authenticated using (true);

drop policy if exists "players insert their own entries on open sessions" on public.session_entries;
create policy "players insert their own entries on open sessions" on public.session_entries
  for insert to authenticated
  with check (
    player_id = public.current_player_id()
    and exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.status in ('scheduled','live','pending_approval')
    )
  );

drop policy if exists "players delete their own entries on open sessions" on public.session_entries;
create policy "players delete their own entries on open sessions" on public.session_entries
  for delete to authenticated
  using (
    player_id = public.current_player_id()
    and exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.status in ('scheduled','live','pending_approval')
    )
  );

-- Admin overrides via service role.

-- ---- push_subscriptions ----
drop policy if exists "players manage their own push subs" on public.push_subscriptions;
create policy "players manage their own push subs" on public.push_subscriptions
  for all to authenticated
  using (player_id = public.current_player_id())
  with check (player_id = public.current_player_id());

-- ============================================================================
-- AUTO-LINK NEW AUTH USERS TO PLAYERS
-- ============================================================================
-- When a user signs in via magic link, look up the players row by email and
-- set auth_user_id. This means the host can pre-create the roster (with just
-- emails) and players auto-link on first login.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.players
  set auth_user_id = new.id
  where lower(email) = lower(new.email)
    and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
