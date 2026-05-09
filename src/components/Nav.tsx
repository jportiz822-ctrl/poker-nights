import Link from "next/link";

interface NavPlayer {
  id: string;
  display_name: string;
  is_admin: boolean;
}

export function Nav({ player }: { player: NavPlayer | null }) {
  return (
    <header className="sticky top-0 z-30 bg-felt-900/80 backdrop-blur border-b border-felt-700">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-chip-gold">♠</span>
          <span>Poker Nights</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {player ? (
            <>
              <Link href="/leaderboard" className="hover:text-chip-gold">
                Board
              </Link>
              <Link href="/me" className="hover:text-chip-gold">
                Me
              </Link>
              {player.is_admin && (
                <Link href="/admin" className="hover:text-chip-gold">
                  Admin
                </Link>
              )}
            </>
          ) : (
            <Link href="/login" className="hover:text-chip-gold">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
