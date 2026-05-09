import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlayersAdminClient } from "./PlayersAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
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

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .order("display_name", { ascending: true });

  return <PlayersAdminClient initialPlayers={players ?? []} />;
}
