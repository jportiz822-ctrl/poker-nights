import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { centsToDollars, centsToSignedDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, joined_at")
    .eq("id", id)
    .maybeSingle();
  if (!player) notFound();

  const [{ data: lifetime }, { data: history }] = await Promise.all([
    supabase.from("player_lifetime_stats").select("*").eq("player_id", id).maybeSingle(),
    supabase
      .from("player_session_nets")
      .select("*")
      .eq("player_id", id)
      .eq("status", "finalized")
      .order("played_on", { ascending: false })
      .limit(50),
  ]);

  const net = lifetime?.net_cents ?? 0;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-felt-100/70 text-sm">Player</p>
        <h1 className="text-3xl font-bold">{player.display_name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Lifetime P/L"
          value={centsToSignedDollars(net)}
          accent={net >= 0 ? "good" : "bad"}
        />
        <Tile label="Sessions" value={(lifetime?.sessions_played ?? 0).toString()} />
        <Tile
          label="Biggest win"
          value={centsToDollars(lifetime?.biggest_win_cents ?? 0)}
          accent="good"
        />
        <Tile
          label="Biggest loss"
          value={centsToDollars(lifetime?.biggest_loss_cents ?? 0)}
          accent="bad"
        />
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Recent sessions</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-felt-100/60 text-sm">No finalized sessions yet.</p>
        ) : (
          <div className="divide-y divide-felt-600 text-sm">
            {(history ?? []).map((h) => (
              <Link
                key={h.session_id}
                href={`/session/${h.session_id}`}
                className="py-2 flex justify-between items-center"
              >
                <span>{h.played_on}</span>
                <span
                  className={
                    h.net_cents > 0
                      ? "text-chip-gold font-semibold"
                      : h.net_cents < 0
                        ? "text-chip-red font-semibold"
                        : "text-felt-100/60"
                  }
                >
                  {centsToSignedDollars(h.net_cents)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "bad";
}) {
  return (
    <div className="card">
      <p className="text-felt-100/70 text-xs">{label}</p>
      <p
        className={`text-xl font-bold ${
          accent === "good" ? "text-chip-gold" : accent === "bad" ? "text-chip-red" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
