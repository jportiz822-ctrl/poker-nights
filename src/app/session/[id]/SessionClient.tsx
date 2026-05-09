"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { centsToDollars, centsToSignedDollars, dollarsToCents } from "@/lib/money";
import type { Session, SessionEntry, SessionTotals } from "@/lib/types";
import { computeSettlement, type PlayerNet } from "@/lib/settlement";

interface PlayerLite {
  id: string;
  display_name: string;
  is_active: boolean;
}

interface CurrentPlayer {
  id: string;
  display_name: string;
  is_admin: boolean;
}

interface Props {
  session: Session;
  entries: SessionEntry[];
  players: PlayerLite[];
  totals: SessionTotals | null;
  currentPlayer: CurrentPlayer;
}

const PRESETS = [20, 50, 100, 200];

export function SessionClient({ session, entries, players, totals, currentPlayer }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  const isOpen =
    session.status === "scheduled" ||
    session.status === "live" ||
    session.status === "pending_approval";
  const isFinalized = session.status === "finalized";
  const isCanceled = session.status === "canceled";

  const playerById = useMemo(() => {
    const m = new Map<string, PlayerLite>();
    players.forEach((p) => m.set(p.id, p));
    return m;
  }, [players]);

  const myEntries = entries.filter((e) => e.player_id === currentPlayer.id);
  const myBuyIn = myEntries
    .filter((e) => e.kind === "buy_in")
    .reduce((s, e) => s + e.amount_cents, 0);
  const myCashOut = myEntries
    .filter((e) => e.kind === "cash_out")
    .reduce((s, e) => s + e.amount_cents, 0);

  const playerRows = useMemo(() => {
    const map = new Map<string, { player_id: string; buy_in: number; cash_out: number }>();
    entries.forEach((e) => {
      const r = map.get(e.player_id) ?? { player_id: e.player_id, buy_in: 0, cash_out: 0 };
      if (e.kind === "buy_in") r.buy_in += e.amount_cents;
      else r.cash_out += e.amount_cents;
      map.set(e.player_id, r);
    });
    return Array.from(map.values()).map((r) => ({
      ...r,
      name: playerById.get(r.player_id)?.display_name ?? "Unknown",
      net: r.cash_out - r.buy_in,
    }));
  }, [entries, playerById]);

  const transfers = useMemo(() => {
    if (!totals || totals.imbalance_cents !== 0) return [];
    const nets: PlayerNet[] = playerRows.map((r) => ({
      player_id: r.player_id,
      display_name: r.name,
      net_cents: r.net,
    }));
    return computeSettlement(nets);
  }, [totals, playerRows]);

  async function addEntry(kind: "buy_in" | "cash_out", raw: string) {
    setError("");
    const cents = dollarsToCents(raw);
    if (cents === null || cents <= 0) {
      setError("Enter a positive dollar amount, like 50 or 100.50");
      return;
    }
    setBusy(true);
    const { error: insErr } = await supabase.from("session_entries").insert({
      session_id: session.id,
      player_id: currentPlayer.id,
      kind,
      amount_cents: cents,
      recorded_by: currentPlayer.id,
    });
    setBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    if (kind === "buy_in") setBuyAmount("");
    else setCashAmount("");
    router.refresh();
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Delete this entry?")) return;
    setBusy(true);
    const { error: delErr } = await supabase.from("session_entries").delete().eq("id", entryId);
    setBusy(false);
    if (delErr) setError(delErr.message);
    else router.refresh();
  }

  async function adminAction(path: string, body?: object) {
    setBusy(true);
    setError("");
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  const canApprove =
    isOpen &&
    (currentPlayer.is_admin || session.approver_id === currentPlayer.id) &&
    totals?.imbalance_cents === 0 &&
    (totals?.player_count ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-felt-100/70">Session</p>
        <h1 className="text-3xl font-bold">{session.played_on}</h1>
        <p className="text-sm mt-1">
          <StatusBadge status={session.status} />
        </p>
      </div>

      {/* My entries */}
      {isOpen && (
        <div className="card space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Your night</h2>
            <p className="text-sm">
              <span className="text-felt-100/70">Net </span>
              <span
                className={
                  myCashOut - myBuyIn > 0
                    ? "text-chip-gold font-semibold"
                    : myCashOut - myBuyIn < 0
                      ? "text-chip-red font-semibold"
                      : ""
                }
              >
                {centsToSignedDollars(myCashOut - myBuyIn)}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Buy-ins" value={centsToDollars(myBuyIn)} />
            <Stat label="Cash-out" value={centsToDollars(myCashOut)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Add a buy-in</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => addEntry("buy_in", String(v))}
                >
                  +${v}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                placeholder="Custom amount"
                className="input"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
              />
              <button
                className="btn-primary whitespace-nowrap"
                disabled={busy || !buyAmount}
                onClick={() => addEntry("buy_in", buyAmount)}
              >
                Buy-in
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Cash out</p>
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                placeholder="Final stack"
                className="input"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
              />
              <button
                className="btn-primary whitespace-nowrap"
                disabled={busy || !cashAmount}
                onClick={() => addEntry("cash_out", cashAmount)}
              >
                Cash out
              </button>
            </div>
            <p className="text-xs text-felt-100/60">
              You can record multiple cash-outs if you re-bought after busting.
            </p>
          </div>

          {error && <p className="text-chip-red text-sm">{error}</p>}

          {myEntries.length > 0 && (
            <div className="text-sm space-y-1 pt-2 border-t border-felt-600">
              <p className="text-felt-100/70 text-xs uppercase mb-1">My entries</p>
              {myEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <span>
                    <span
                      className={
                        e.kind === "buy_in" ? "text-chip-red" : "text-chip-gold"
                      }
                    >
                      {e.kind === "buy_in" ? "Buy-in" : "Cash-out"}
                    </span>{" "}
                    {centsToDollars(e.amount_cents)}
                  </span>
                  <button
                    className="text-felt-100/60 hover:text-chip-red text-xs"
                    onClick={() => deleteEntry(e.id)}
                    disabled={busy}
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session standings */}
      <div className="card space-y-3">
        <h2 className="font-semibold">The table</h2>
        {playerRows.length === 0 ? (
          <p className="text-felt-100/60 text-sm">No entries yet.</p>
        ) : (
          <div className="divide-y divide-felt-600">
            {playerRows
              .sort((a, b) => b.net - a.net)
              .map((r) => (
                <div key={r.player_id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-felt-100/60 text-xs">
                      {centsToDollars(r.buy_in)} in · {centsToDollars(r.cash_out)} out
                    </p>
                  </div>
                  <span
                    className={
                      r.net > 0
                        ? "text-chip-gold font-semibold"
                        : r.net < 0
                          ? "text-chip-red font-semibold"
                          : "text-felt-100/60"
                    }
                  >
                    {centsToSignedDollars(r.net)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {totals && (
          <div className="pt-2 border-t border-felt-600 text-sm">
            <div className="flex justify-between">
              <span className="text-felt-100/70">Total in</span>
              <span>{centsToDollars(totals.total_buy_in_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-felt-100/70">Total out</span>
              <span>{centsToDollars(totals.total_cash_out_cents)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1">
              <span>Imbalance</span>
              <span
                className={
                  totals.imbalance_cents === 0 ? "text-chip-gold" : "text-chip-red"
                }
              >
                {totals.imbalance_cents === 0
                  ? "Balanced ✓"
                  : centsToSignedDollars(totals.imbalance_cents)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Settlement */}
      {transfers.length > 0 && (
        <div className="card space-y-2">
          <h2 className="font-semibold">Settle up</h2>
          <ul className="text-sm divide-y divide-felt-600">
            {transfers.map((t, i) => (
              <li key={i} className="py-2 flex justify-between">
                <span>
                  <span className="text-chip-red">{t.from_name}</span> pays{" "}
                  <span className="text-chip-gold">{t.to_name}</span>
                </span>
                <span className="font-semibold">{centsToDollars(t.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin / approver controls */}
      {(currentPlayer.is_admin || session.approver_id === currentPlayer.id) && !isFinalized && !isCanceled && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Host controls</h2>
          <div className="flex flex-wrap gap-2">
            {session.status === "scheduled" && currentPlayer.is_admin && (
              <button
                className="btn-primary"
                onClick={() => adminAction(`/api/session/${session.id}/go-live`)}
                disabled={busy}
              >
                Game live → notify everyone
              </button>
            )}
            {(session.status === "live" || session.status === "pending_approval") && (
              <button
                className="btn-primary"
                onClick={() => adminAction(`/api/session/${session.id}/approve`)}
                disabled={busy || !canApprove}
                title={
                  !canApprove
                    ? "Session must be balanced and have at least one player to finalize"
                    : ""
                }
              >
                Finalize results
              </button>
            )}
            {currentPlayer.is_admin && (
              <DelegatePicker
                sessionId={session.id}
                players={players.filter(
                  (p) => p.is_active && p.id !== currentPlayer.id,
                )}
                currentApprover={session.approver_id}
                onSubmit={(toId) =>
                  adminAction(`/api/session/${session.id}/delegate`, { delegate_to: toId })
                }
                disabled={busy}
              />
            )}
            {currentPlayer.is_admin && (
              <button
                className="btn-danger"
                onClick={() => adminAction(`/api/session/${session.id}/cancel`)}
                disabled={busy}
              >
                Cancel session
              </button>
            )}
          </div>
          {!canApprove && (session.status === "live" || session.status === "pending_approval") && (
            <p className="text-xs text-felt-100/60">
              Can&apos;t finalize until total buy-ins equal total cash-outs and at least one player
              has entries.
            </p>
          )}
        </div>
      )}

      {isFinalized && (
        <div className="card text-center text-felt-100/80 text-sm">Session finalized ✓</div>
      )}
      {isCanceled && (
        <div className="card text-center text-felt-100/60 text-sm">Session canceled</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-felt-900/40 px-3 py-2">
      <p className="text-felt-100/60 text-xs">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const styles: Record<Session["status"], string> = {
    scheduled: "bg-felt-600/60 text-felt-100",
    live: "bg-chip-gold text-felt-900",
    pending_approval: "bg-yellow-600/40 text-yellow-100",
    finalized: "bg-felt-600/60 text-felt-100",
    canceled: "bg-chip-red/30 text-chip-red",
  };
  const label: Record<Session["status"], string> = {
    scheduled: "Scheduled",
    live: "Live",
    pending_approval: "Pending approval",
    finalized: "Finalized",
    canceled: "Canceled",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}

function DelegatePicker({
  sessionId,
  players,
  currentApprover,
  onSubmit,
  disabled,
}: {
  sessionId: string;
  players: PlayerLite[];
  currentApprover: string | null;
  onSubmit: (toId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("");
  if (!open)
    return (
      <button className="btn-ghost" onClick={() => setOpen(true)} disabled={disabled}>
        Delegate approver
      </button>
    );
  return (
    <div className="flex gap-2 w-full">
      <select
        className="input flex-1"
        value={pick}
        onChange={(e) => setPick(e.target.value)}
      >
        <option value="">Pick a player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
      <button
        className="btn-primary whitespace-nowrap"
        disabled={!pick || disabled}
        onClick={() => {
          if (pick) onSubmit(pick);
          setOpen(false);
        }}
      >
        Set
      </button>
      <button className="btn-ghost" onClick={() => setOpen(false)}>
        ×
      </button>
      <input type="hidden" value={sessionId} />
      <input type="hidden" value={currentApprover ?? ""} />
    </div>
  );
}
