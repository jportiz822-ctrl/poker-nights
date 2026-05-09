"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function PushPrompt({ playerId }: { playerId: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void playerId; // referenced to keep prop wired through; subscription is per-device
    if (typeof window === "undefined") return;
    const ok =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [playerId]);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        }));
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register");
      }
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable notifications");
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;
  if (!supported) return null;
  if (subscribed) return null;

  return (
    <div className="card border-chip-gold/40 space-y-2">
      <p className="font-semibold">Get game-night alerts</p>
      <p className="text-sm text-felt-100/80">
        Turn on notifications so we can ping you when the game goes live and every Monday at 8pm.
      </p>
      <button className="btn-primary" onClick={enable} disabled={busy}>
        {busy ? "Enabling…" : permission === "denied" ? "Notifications blocked" : "Enable notifications"}
      </button>
      {permission === "denied" && (
        <p className="text-xs text-felt-100/60">
          You denied notifications. Re-enable in your phone&apos;s Settings → Notifications → Poker Nights.
        </p>
      )}
      {error && <p className="text-chip-red text-sm">{error}</p>}
    </div>
  );
}
