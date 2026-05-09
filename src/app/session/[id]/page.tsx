import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionClient } from "./SessionClient";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (!player) redirect("/");

  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();

  const [{ data: entries }, { data: players }, { data: totals }] = await Promise.all([
    supabase
      .from("session_entries")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("players")
      .select("id, display_name, is_active")
      .order("display_name", { ascending: true }),
    supabase.from("session_totals").select("*").eq("session_id", id).maybeSingle(),
  ]);

  return (
    <SessionClient
      session={session}
      entries={entries ?? []}
      players={players ?? []}
      totals={totals ?? null}
      currentPlayer={player}
    />
  );
}
