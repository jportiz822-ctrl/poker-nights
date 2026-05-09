import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { centsToDollars, centsToSignedDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, email")
    .eq("auth_user_id", user.id)
    .single();
  if (!player) redirect("/");

  const [{ data: lifetime }, { data: history }] = await Promise.all([
    supabase
      .from("player_lifetime_stats")
      .select("*")
      .eq("player_id", player.id)
      .maybeSingle(),
    supabase
      .from("player_session_nets")
      .select("*")
      .eq("player_id", player.id)
      .order("played_on", { ascending: false })
      .limit(50),
  ]);

  const totalSessions = lifetime?.sessions_played ?? 0;
  const net = lifetime?.net_cents ?? 0;
  const biggestWin = lifetime?.biggest_win_cents ?? 0;
  const biggestLoss = lifetime?.biggest_loss_cents ?? 0;
  const totalIn = lifetime?.total_buy_in_cents ?? 0;
  const roi = totalIn > 0 ? (net / totalIn) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-felt-100/70 text-sm">Your stats</p>
        <h1 className="text-3xl font-bold">{player.display_name}</h1>
        <p className="text-felt-100/60 text-xs">{player.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BigStat label="Lifetime P/L" value={centsToSignedDollars(net)} accent={net >= 0 ? "good" : "bad"} />
        <BigStat label="Sessions" value={totalSessions.toString()} />
        <BigStat label="Biggest win" value={centsToDollars(biggestWin)} accent="good" />
        <BigStat label="Biggest loss" value={centsToDollars(biggestLoss)} accent="bad" />
        <BigStat label="Total bought in" value={centsToDollars(totalIn)} />
        <BigStat label="ROI" value={`${roi.toFixed(1)}%`} accent={roi >= 0 ? "good" : "bad"} />
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Session history</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-felt-100/60 text-sm">No sessions yet.</p>
        ) : (
          <div className="divide-y divide-felt-600 text-sm">
            {(history ?? []).map((h) => (
              <Link
                href={`/session/${h.session_id}`}
                key={h.session_id}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{h.played_on}</p>
                  <p className="text-xs text-felt-100/60">
                    {centsToDollars(h.buy_in_cents)} in · {centsToDollars(h.cash_out_cents)} out
                    {h.status !== "finalized" && ` · ${h.status}`}
                  </p>
                </div>
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

      <form action="/auth/signout" method="post">
        <button className="btn-ghost w-full">Sign out</button>
      </form>
    </div>
  );
}

function BigStat({
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
