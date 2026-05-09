"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // Handle implicit-flow tokens that land in the URL hash (e.g. from admin-generated magic links)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;
    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (!error) router.replace("/");
    });
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">♠♥♦♣</div>
        <h1 className="text-3xl font-bold">Poker Nights</h1>
        <p className="text-felt-100/70">Sign in with your email — we&apos;ll send a magic link.</p>
      </div>

      {status === "sent" ? (
        <div className="card text-center space-y-2">
          <p className="text-xl font-semibold">Check your email 📬</p>
          <p className="text-felt-100/80">
            We sent a sign-in link to <span className="font-mono">{email}</span>. Tap it on your
            phone to sign in.
          </p>
        </div>
      ) : (
        <form onSubmit={send} className="card space-y-4">
          <label className="block">
            <span className="text-sm text-felt-100/80 mb-1 block">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {errorMsg && <p className="text-chip-red text-sm">{errorMsg}</p>}
          <p className="text-xs text-felt-100/60">
            Your email must be on the roster. Ask the host (admin) to add you if you don&apos;t have
            access.
          </p>
        </form>
      )}
    </div>
  );
}
