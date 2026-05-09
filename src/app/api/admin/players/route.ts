import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 } as const;
  const { data: player } = await supabase
    .from("players")
    .select("id, is_admin")
    .eq("auth_user_id", user.id)
    .single();
  if (!player?.is_admin) return { error: "admin only", status: 403 } as const;
  return { player } as const;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    display_name?: string;
    is_admin?: boolean;
  };
  const email = body.email?.trim().toLowerCase();
  const display_name = body.display_name?.trim();
  if (!email || !display_name)
    return NextResponse.json({ error: "email and display_name required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("players")
    .insert({ email, display_name, is_admin: !!body.is_admin })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ player: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    display_name?: string;
    is_admin?: boolean;
    is_active?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.display_name !== undefined) update.display_name = body.display_name;
  if (body.is_admin !== undefined) update.is_admin = body.is_admin;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const admin = createAdminClient();
  const { error } = await admin.from("players").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
