import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function configure() {
  if (configured) return;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Send a push to every active player who has at least one push subscription.
// Returns counts of {sent, failed, removed}.
export async function broadcastPush(payload: PushPayload) {
  configure();
  const admin = createAdminClient();
  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) throw error;

  const toRemove: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6 },
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // subscription is dead — clean up
          toRemove.push(s.id);
        } else {
          failed++;
        }
      }
    }),
  );

  if (toRemove.length) {
    await admin.from("push_subscriptions").delete().in("id", toRemove);
  }

  return { sent, failed, removed: toRemove.length };
}
