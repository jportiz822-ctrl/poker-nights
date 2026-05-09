import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { played_on?: string };
  if (!body.played_on || !/^\d{4}-\d{2}-\d{2}$/.test(body.played_on))
    return NextResponse.json({ error: "played_on (YYYY-MM-DD) required" }, { status: 400 });

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
  const { data, error } = await admin
    .from("sessions")
    .insert({
      played_on: body.played_on,
      status: "scheduled",
      created_by: player.id,
      approver_id: player.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: data });
}
