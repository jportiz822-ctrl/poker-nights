// Compute the next Monday 8pm in the configured timezone (default America/New_York).
// We use Intl APIs so this works on Edge runtime without a bigger TZ library.

const TZ = process.env.GAME_TIMEZONE || "America/New_York";

function partsInTz(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday, // "Mon" "Tue" ...
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function isMondayInTz(now: Date = new Date(), tz: string = TZ): boolean {
  return partsInTz(now, tz).weekday === "Mon";
}

export function tzNow(now: Date = new Date(), tz: string = TZ) {
  return partsInTz(now, tz);
}

export function describeNextGame(now: Date = new Date(), tz: string = TZ): string {
  const p = partsInTz(now, tz);
  const wd = WEEKDAY_INDEX[p.weekday];
  let daysUntilMonday = (1 - wd + 7) % 7;
  if (daysUntilMonday === 0 && p.hour >= 20) daysUntilMonday = 7;
  if (daysUntilMonday === 0) {
    return `Tonight 8:00 PM (${tz.split("/")[1].replace("_", " ")})`;
  }
  if (daysUntilMonday === 1) return `Tomorrow 8:00 PM`;
  return `Monday in ${daysUntilMonday} days, 8:00 PM`;
}
