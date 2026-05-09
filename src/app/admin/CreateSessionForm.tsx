"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const delta = (1 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function CreateSessionForm() {
  const router = useRouter();
  const [date, setDate] = useState(nextMonday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/session/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ played_on: date }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
      return;
    }
    const { session } = await res.json();
    router.push(`/session/${session.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Create a session</h2>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
          required
        />
        <button className="btn-primary whitespace-nowrap" disabled={busy}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="text-chip-red text-sm">{error}</p>}
      <p className="text-xs text-felt-100/60">
        Defaults to next Monday. The Monday-night reminder will auto-create a session if you forget.
      </p>
    </form>
  );
}
