import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("id, is_admin")
    .eq("auth_user_id", user.id)
    .single();
  if (!player) return NextResponse.json({ error: "no player" }, { status: 403 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("sessions").select("*").eq("id", id).single();
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isApprover = player.is_admin || session.approver_id === player.id;
  if (!isApprover) return NextResponse.json({ error: "not approver" }, { status: 403 });

  if (!["live", "pending_approval", "scheduled"].includes(session.status))
    return NextResponse.json({ error: "session not approvable" }, { status: 400 });

  const { data: totals } = await admin
    .from("session_totals")
    .select("*")
    .eq("session_id", id)
    .single();

  if (!totals || totals.imbalance_cents !== 0)
    return NextResponse.json(
      { error: "session not balanced — totals must match" },
      { status: 400 },
    );
  if (totals.player_count === 0)
    return NextResponse.json({ error: "no entries" }, { status: 400 });

  const { error } = await admin
    .from("sessions")
    .update({
      status: "finalized",
      approved_by: player.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
