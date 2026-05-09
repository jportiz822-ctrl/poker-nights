import { NextResponse, type NextRequest } from "next/server";
import { broadcastPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMondayInTz, tzNow } from "@/lib/schedule";

// Vercel cron hits this daily; we only fire on Monday in the configured TZ,
// and only at the configured local hour.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isMondayInTz()) {
    return NextResponse.json({ skipped: "not monday in game timezone" });
  }

  // We schedule the cron daily at 00:00 UTC — for Eastern Time that's 8pm
  // the previous day. Adjust the cron in vercel.json so the local hour is 8pm.
  const local = tzNow();
  if (local.hour !== 20) {
    return NextResponse.json({ skipped: `local hour ${local.hour} not 20:00` });
  }

  // Auto-create a session row for tonight if there isn't one yet.
  const admin = createAdminClient();
  const today = new Date(Date.UTC(local.year, local.month - 1, local.day))
    .toISOString()
    .slice(0, 10);
  const { data: existing } = await admin
    .from("sessions")
    .select("id")
    .eq("played_on", today)
    .maybeSingle();
  if (!existing) {
    await admin
      .from("sessions")
      .insert({ played_on: today, status: "scheduled" });
  }

  const result = await broadcastPush({
    title: "♠ Poker night reminder",
    body: "8pm tonight. Be at the table.",
    url: "/",
  });

  return NextResponse.json({ fired: true, ...result });
}
