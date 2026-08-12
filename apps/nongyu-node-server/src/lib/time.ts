/** Format Date as ISO-8601 UTC string */
export function toIsoUtc(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function toIsoUtcRequired(value: Date | string): string {
  const s = toIsoUtc(value);
  if (!s) throw new Error("Invalid datetime");
  return s;
}

export function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/** Business calendar day bounds in UTC for a given IANA timezone (e.g. Asia/Shanghai). */
export function businessDayUtcRange(
  tz: string,
  now = new Date(),
): { start: Date; end: Date; dateKey: string } {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Find UTC instants for local midnight by probing; use formatter offset approach
  const start = zonedTimeToUtc(`${dateKey}T00:00:00`, tz);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dateKey };
}

function zonedTimeToUtc(localIsoWithoutZ: string, timeZone: string): Date {
  // localIsoWithoutZ like 2026-08-12T00:00:00
  const asUtc = new Date(`${localIsoWithoutZ}Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(asUtc)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  const asLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = asLocal - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}

export function eachBusinessDateKeys(tz: string, days: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return [...new Set(keys)];
}
