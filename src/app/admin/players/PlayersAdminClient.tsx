"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

export function PlayersAdminClient({ initialPlayers }: { initialPlayers: Player[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, display_name: name }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
      return;
    }
    const { player } = await res.json();
    setPlayers((p) => [...p, player].sort((a, b) => a.display_name.localeCompare(b.display_name)));
    setEmail("");
    setName("");
    router.refresh();
  }

  async function update(id: string, patch: Partial<Player>) {
    const res = await fetch("/api/admin/players", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed");
      return;
    }
    setPlayers((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-felt-100/70 text-sm">Admin</p>
        <h1 className="text-3xl font-bold">Roster</h1>
      </div>

      <form onSubmit={add} className="card space-y-3">
        <h2 className="font-semibold">Add a player</h2>
        <input
          type="text"
          required
          placeholder="Name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          required
          placeholder="Email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Adding…" : "Add player"}
        </button>
        {error && <p className="text-chip-red text-sm">{error}</p>}
        <p className="text-xs text-felt-100/60">
          They&apos;ll be able to sign in immediately by entering this email on the sign-in page.
        </p>
      </form>

      <div className="card divide-y divide-felt-600">
        {players.map((p) => (
          <div key={p.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{p.display_name}</p>
              <p className="text-xs text-felt-100/60 truncate">{p.email}</p>
              <div className="flex gap-2 text-[10px] uppercase mt-1">
                {p.is_admin && (
                  <span className="px-2 py-0.5 rounded bg-chip-gold/20 text-chip-gold">admin</span>
                )}
                {!p.is_active && (
                  <span className="px-2 py-0.5 rounded bg-felt-600/40 text-felt-100/70">inactive</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <button
                className="text-felt-100/70 hover:text-chip-gold"
                onClick={() => update(p.id, { is_admin: !p.is_admin })}
              >
                {p.is_admin ? "remove admin" : "make admin"}
              </button>
              <button
                className="text-felt-100/70 hover:text-chip-red"
                onClick={() => update(p.id, { is_active: !p.is_active })}
              >
                {p.is_active ? "deactivate" : "reactivate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
