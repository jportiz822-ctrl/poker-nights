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
  if (!player?.is_admin)
    return NextResponse.json({ error: "admin only" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("sessions")
    .update({ status: "canceled" })
    .eq("id", id)
    .neq("status", "finalized");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
