import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { describeNextGame } from "@/lib/schedule";
import { centsToSignedDollars } from "@/lib/money";
import { PushPrompt } from "@/components/PushPrompt";
import { InstallHint } from "@/components/InstallHint";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, is_admin")
    .eq("auth_user_id", user.id)
    .single();

  if (!player) {
    return (
      <div className="card space-y-3 mt-8 text-center">
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="text-felt-100/80">
          Your email isn&apos;t on the roster yet. Ask the host to add you, then sign in again.
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost mt-2">Sign out</button>
        </form>
      </div>
    );
  }

  const { data: openSession } = await supabase
    .from("sessions")
    .select("*")
    .in("status", ["live", "pending_approval"])
    .order("played_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: scheduled } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "scheduled")
    .order("played_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: topPlayers } = await supabase
    .from("player_lifetime_stats")
    .select("*")
    .order("net_cents", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-felt-100/70 text-sm">Welcome back,</p>
        <h1 className="text-3xl font-bold">{player.display_name}</h1>
      </section>

      {openSession ? (
        <Link href={`/session/${openSession.id}`} className="block">
          <div className="card border-chip-gold/60 hover:border-chip-gold transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-chip-gold">
                  {openSession.status === "live" ? "Game live" : "Awaiting approval"}
                </p>
                <p className="text-xl font-bold">{openSession.played_on}</p>
              </div>
              <span className="text-3xl">→</span>
            </div>
          </div>
        </Link>
      ) : scheduled ? (
        <div className="card space-y-1">
          <p className="text-xs uppercase tracking-wider text-felt-100/70">Next game</p>
          <p className="text-xl font-bold">{scheduled.played_on}</p>
          <p className="text-felt-100/80">{describeNextGame()}</p>
        </div>
      ) : (
        <div className="card space-y-1">
          <p className="text-xs uppercase tracking-wider text-felt-100/70">Next game</p>
          <p className="text-felt-100/80">{describeNextGame()}</p>
          {player.is_admin && (
            <p className="text-felt-100/60 text-sm pt-2">
              No session scheduled — go to{" "}
              <Link href="/admin" className="text-chip-gold underline">
                Admin
              </Link>{" "}
              to create one.
            </p>
          )}
        </div>
      )}

      <PushPrompt playerId={player.id} />
      <InstallHint />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">All-time leaders</h2>
          <Link href="/leaderboard" className="text-sm text-chip-gold">
            See all →
          </Link>
        </div>
        <div className="card divide-y divide-felt-600">
          {(topPlayers ?? []).map((p, i) => (
            <Link
              key={p.player_id}
              href={`/players/${p.player_id}`}
              className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-felt-100/60 w-6">{i + 1}.</span>
                <span>{p.display_name}</span>
              </div>
              <span
                className={
                  p.net_cents > 0
                    ? "text-chip-gold font-semibold"
                    : p.net_cents < 0
                      ? "text-chip-red font-semibold"
                      : "text-felt-100/60"
                }
              >
                {centsToSignedDollars(p.net_cents)}
              </span>
            </Link>
          ))}
          {(topPlayers ?? []).length === 0 && (
            <p className="text-felt-100/60 text-sm">No finalized sessions yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
