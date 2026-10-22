export type ScheduleSettings = {
  intervalMinutes: number;
  dailyLimit: number;
  startMinute: number;
  endMinute: number;
  weekdays: number[];
  timezone: string;
  resumeAfter: Date;
};
const formatters = new Map<string, Intl.DateTimeFormat>();
export function localParts(date: Date, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timezone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    day,
    weekday: new Date(`${day}T12:00:00Z`).getUTCDay(),
    minute: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
export function inWindow(date: Date, settings: ScheduleSettings) {
  const p = localParts(date, settings.timezone);
  return (
    settings.weekdays.includes(p.weekday) &&
    p.minute >= settings.startMinute &&
    p.minute < settings.endMinute
  );
}
// Advance in UTC: repeated/missing local hours during DST do not corrupt the elapsed interval.
export function nextSlot(
  settings: ScheduleSettings,
  from: Date,
  lastAttempt: Date | null,
  used: Date[],
): Date {
  const earliest = Math.max(
    from.getTime(),
    settings.resumeAfter.getTime(),
    lastAttempt ? lastAttempt.getTime() + settings.intervalMinutes * 60000 : 0,
  );
  let time = Math.ceil(earliest / 60000) * 60000;
  const counts = new Map<string, number>();
  for (const date of used) {
    const day = localParts(date, settings.timezone).day;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  for (let i = 0; i < 60 * 24 * 22; i++, time += 60000) {
    const date = new Date(time);
    if (
      inWindow(date, settings) &&
      (counts.get(localParts(date, settings.timezone).day) ?? 0) <
        settings.dailyLimit
    )
      return date;
  }
  throw new Error("Aucun créneau disponible dans les 22 prochains jours");
}
export function parseLocalDate(value: string, timezone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Date locale invalide");
  const base = Date.parse(`${value}Z`);
  if (!Number.isFinite(base)) throw new Error("Date invalide");
  const [day, hm] = value.split("T");
  const [h, m] = hm.split(":").map(Number);
  const matches: Date[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset++) {
    const date = new Date(base + offset * 60000);
    const p = localParts(date, timezone);
    if (p.day === day && p.minute === h * 60 + m) matches.push(date);
  }
  if (matches.length !== 1)
    throw new Error(
      "Cette heure locale est inexistante ou ambiguë (changement d'heure). Choisissez une autre heure.",
    );
  return matches[0];
}
