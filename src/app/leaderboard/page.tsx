import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { centsToDollars, centsToSignedDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stats } = await supabase
    .from("player_lifetime_stats")
    .select("*")
    .order("net_cents", { ascending: false });

  const winners = (stats ?? []).filter((s) => s.sessions_played > 0);
  const donkeys = [...winners].sort((a, b) => a.net_cents - b.net_cents);
  const topDonkey = donkeys[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-felt-100/70 text-sm">All-time, finalized sessions only.</p>
      </div>

      {topDonkey && topDonkey.net_cents < 0 && (
        <div className="card border-chip-red/50 space-y-1">
          <p className="text-xs uppercase tracking-wider text-chip-red">Biggest Donkey</p>
          <Link href={`/players/${topDonkey.player_id}`} className="block">
            <p className="text-xl font-bold">{topDonkey.display_name}</p>
            <p className="text-chip-red font-semibold">{centsToSignedDollars(topDonkey.net_cents)}</p>
            <p className="text-xs text-felt-100/60">over {topDonkey.sessions_played} sessions</p>
          </Link>
        </div>
      )}

      <div className="card divide-y divide-felt-600">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 pb-2 text-xs uppercase text-felt-100/60">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Sessions</span>
          <span className="text-right">Net</span>
        </div>
        {winners.length === 0 && (
          <p className="text-felt-100/60 text-sm py-4">No finalized sessions yet.</p>
        )}
        {winners.map((p, i) => (
          <Link
            key={p.player_id}
            href={`/players/${p.player_id}`}
            className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 py-2 items-center"
          >
            <span className="text-felt-100/60">{i + 1}</span>
            <span className="font-medium">{p.display_name}</span>
            <span className="text-right text-felt-100/70 text-sm">{p.sessions_played}</span>
            <span
              className={`text-right font-semibold ${
                p.net_cents > 0
                  ? "text-chip-gold"
                  : p.net_cents < 0
                    ? "text-chip-red"
                    : "text-felt-100/60"
              }`}
            >
              {centsToSignedDollars(p.net_cents)}
            </span>
          </Link>
        ))}
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">More stats</summary>
        <div className="mt-3 space-y-2 text-sm">
          <Stat
            label="Biggest single-night win"
            best={winners.reduce(
              (best, p) =>
                p.biggest_win_cents > (best?.amount ?? 0)
                  ? { name: p.display_name, id: p.player_id, amount: p.biggest_win_cents }
                  : best,
              null as { name: string; id: string; amount: number } | null,
            )}
          />
          <Stat
            label="Biggest single-night loss"
            best={winners.reduce(
              (best, p) =>
                p.biggest_loss_cents < (best?.amount ?? 0)
                  ? { name: p.display_name, id: p.player_id, amount: p.biggest_loss_cents }
                  : best,
              null as { name: string; id: string; amount: number } | null,
            )}
          />
          <Stat
            label="Most sessions played"
            best={winners.reduce(
              (best, p) =>
                p.sessions_played > (best?.amount ?? 0)
                  ? { name: p.display_name, id: p.player_id, amount: p.sessions_played }
                  : best,
              null as { name: string; id: string; amount: number } | null,
            )}
            unit="sessions"
          />
        </div>
      </details>
    </div>
  );
}

function Stat({
  label,
  best,
  unit,
}: {
  label: string;
  best: { name: string; id: string; amount: number } | null;
  unit?: string;
}) {
  if (!best) return null;
  return (
    <div className="flex justify-between">
      <span className="text-felt-100/70">{label}</span>
      <Link href={`/players/${best.id}`} className="text-right">
        <span className="font-semibold">{best.name}</span>{" "}
        <span className="text-felt-100/70">
          {unit ? `${best.amount} ${unit}` : centsToDollars(Math.abs(best.amount))}
        </span>
      </Link>
    </div>
  );
}
