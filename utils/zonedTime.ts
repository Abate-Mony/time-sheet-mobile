// Timezone maths without dayjs's timezone plugin. That plugin re-parses
// locale date strings, which React Native's Hermes engine doesn't parse the
// way browsers/Node do — on a real iPhone it produced times off by random
// amounts (e.g. a shift's start shifted +58 min but its end +32 min). This
// only uses Intl.DateTimeFormat's numeric parts, which Hermes supports, and
// never parses a date string.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let dtf = formatters.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, dtf);
  }
  return dtf;
}

/** The zone's UTC offset in milliseconds at the given instant (e.g. +3600000 for BST). */
export function zoneOffsetMs(epochMs: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const { type, value } of formatterFor(timeZone).formatToParts(new Date(epochMs))) {
    if (type !== "literal") parts[type] = Number(value);
  }
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24, // some engines report midnight as 24
    parts.minute,
    parts.second
  );
  return wallClockAsUtc - Math.floor(epochMs / 1000) * 1000;
}

/**
 * The instant at which it's `time` ("HH:mm") on `date` ("YYYY-MM-DD") in
 * `timeZone`, as epoch ms. Falls back to the device's own timezone if the
 * zone name isn't recognised.
 */
export function zonedTimeToEpoch(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  try {
    // Two passes so a time just after a DST change uses that day's real offset.
    const first = wallClockAsUtc - zoneOffsetMs(wallClockAsUtc, timeZone);
    return wallClockAsUtc - zoneOffsetMs(first, timeZone);
  } catch {
    return new Date(y, m - 1, d, hh, mm).getTime();
  }
}

/** The device's own UTC offset in milliseconds at the given instant. */
export const deviceOffsetMs = (epochMs: number) => -new Date(epochMs).getTimezoneOffset() * 60_000;
