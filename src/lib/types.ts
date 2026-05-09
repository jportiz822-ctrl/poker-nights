export type SessionStatus =
  | "scheduled"
  | "live"
  | "pending_approval"
  | "finalized"
  | "canceled";

export type EntryKind = "buy_in" | "cash_out";

export interface Player {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
  joined_at: string;
}

export interface Session {
  id: string;
  played_on: string;
  status: SessionStatus;
  created_by: string | null;
  approver_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  went_live_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface SessionEntry {
  id: string;
  session_id: string;
  player_id: string;
  kind: EntryKind;
  amount_cents: number;
  recorded_by: string | null;
  created_at: string;
}

export interface PlayerSessionNet {
  session_id: string;
  played_on: string;
  status: SessionStatus;
  player_id: string;
  buy_in_cents: number;
  cash_out_cents: number;
  net_cents: number;
}

export interface SessionTotals {
  session_id: string;
  played_on: string;
  status: SessionStatus;
  total_buy_in_cents: number;
  total_cash_out_cents: number;
  imbalance_cents: number;
  player_count: number;
}

export interface PlayerLifetimeStats {
  player_id: string;
  display_name: string;
  sessions_played: number;
  net_cents: number;
  biggest_win_cents: number;
  biggest_loss_cents: number;
  total_buy_in_cents: number;
}
