import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPush } from "@/lib/push";

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
  if (!player?.is_admin)
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("sessions")
    .update({ status: "live", went_live_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled")
    .select()
    .single();
  if (error || !session)
    return NextResponse.json({ error: error?.message ?? "session not in scheduled state" }, { status: 400 });

  try {
    await broadcastPush({
      title: "🎲 Game live",
      body: `Poker night just started. Get to the table.`,
      url: `/session/${id}`,
    });
  } catch (e) {
    console.error("push broadcast failed", e);
  }

  return NextResponse.json({ ok: true });
}
