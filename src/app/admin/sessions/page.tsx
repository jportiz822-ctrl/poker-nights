import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { centsToDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: player } = await supabase
    .from("players")
    .select("id, is_admin")
    .eq("auth_user_id", user.id)
    .single();
  if (!player?.is_admin) redirect("/");

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, totals:session_totals(total_buy_in_cents, total_cash_out_cents, imbalance_cents, player_count)",
    )
    .order("played_on", { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-felt-100/70 text-sm">Admin</p>
        <h1 className="text-3xl font-bold">All sessions</h1>
      </div>

      <div className="card divide-y divide-felt-600 text-sm">
        {(sessions ?? []).map((s) => {
          const t = Array.isArray(s.totals) ? s.totals[0] : s.totals;
          return (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className="py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{s.played_on}</p>
                <p className="text-xs text-felt-100/60">
                  {s.status} · {t?.player_count ?? 0} players ·{" "}
                  {centsToDollars(t?.total_buy_in_cents ?? 0)} in
                  {t && t.imbalance_cents !== 0 && (
                    <span className="text-chip-red"> · imbalance</span>
                  )}
                </p>
              </div>
              <span className="text-felt-100/60">→</span>
            </Link>
          );
        })}
        {(sessions ?? []).length === 0 && (
          <p className="text-felt-100/60 py-4">No sessions yet.</p>
        )}
      </div>
    </div>
  );
}
