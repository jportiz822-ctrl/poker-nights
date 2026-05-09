// Compute the minimal set of "X pays Y $Z" transfers that settle a session.
// Greedy: repeatedly match the biggest creditor with the biggest debtor.
// For ~30 players this is plenty fast and gives a near-optimal transfer count.

export interface PlayerNet {
  player_id: string;
  display_name: string;
  net_cents: number; // positive = winner (owed money), negative = loser (owes money)
}

export interface Transfer {
  from_player_id: string;
  from_name: string;
  to_player_id: string;
  to_name: string;
  amount_cents: number;
}

export function computeSettlement(nets: PlayerNet[]): Transfer[] {
  const winners = nets
    .filter((p) => p.net_cents > 0)
    .map((p) => ({ ...p }))
    .sort((a, b) => b.net_cents - a.net_cents);
  const losers = nets
    .filter((p) => p.net_cents < 0)
    .map((p) => ({ ...p, net_cents: -p.net_cents }))
    .sort((a, b) => b.net_cents - a.net_cents);

  const transfers: Transfer[] = [];
  let wi = 0;
  let li = 0;

  while (wi < winners.length && li < losers.length) {
    const w = winners[wi];
    const l = losers[li];
    const amount = Math.min(w.net_cents, l.net_cents);
    if (amount > 0) {
      transfers.push({
        from_player_id: l.player_id,
        from_name: l.display_name,
        to_player_id: w.player_id,
        to_name: w.display_name,
        amount_cents: amount,
      });
      w.net_cents -= amount;
      l.net_cents -= amount;
    }
    if (w.net_cents === 0) wi++;
    if (l.net_cents === 0) li++;
  }

  return transfers;
}
