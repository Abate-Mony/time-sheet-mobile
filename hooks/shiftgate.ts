import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { useEffect, useState } from "react"

dayjs.extend(utc)
dayjs.extend(timezone)

const DEFAULT_EARLY_WINDOW_MINUTES = 30

// Matches the backend's TZ fallback (utils/dates.ts) — used only when a
// logged-in session predates companyTimezone being added to the login
// response, so there's nothing better to fall back to yet.
const DEFAULT_TZ = "Europe/London"

// job.date + startTime/endTime are wall-clock times in the COMPANY's
// timezone, not the device's — a worker's phone has no idea what timezone
// the shift was scheduled in. Parsing them with plain dayjs() (device-local)
// silently disagrees with the backend's own company-timezone check,
// producing a gate that can be minutes to hours off from reality depending
// on how far the device is from the company's timezone.
function getShiftWindow(date: string, startTime: string, endTime: string, tz: string) {
    // job.date is stored as UTC midnight (toUtcDay on the backend) — reading
    // it with plain dayjs() instead of dayjs.utc() would format it in the
    // DEVICE's local time, silently rolling the calendar day back by one for
    // anyone far enough behind UTC (e.g. California, where Apple's review
    // team is largely based), landing the whole window a day in the past.
    const dateStr = dayjs.utc(date).format("YYYY-MM-DD")
    const start = dayjs.tz(`${dateStr} ${startTime}`, tz)
    let end = dayjs.tz(`${dateStr} ${endTime}`, tz)
    if (end.isBefore(start)) end = end.add(1, "day") // overnight shift
    return { start, end }
}

// A worker can only clock in once within `earlyWindowMinutes` of the shift's
// scheduled start (or after it) — not the moment they accept the job, which
// may be days ahead. Once the shift's scheduled end has also passed (e.g. it
// was never started yesterday), it's expired and can't be started at all.
export function useShiftStartGate(
    date: string | undefined,
    startTime: string | undefined,
    endTime: string | undefined,
    companyTimezone: string | undefined,
    earlyWindowMinutes = DEFAULT_EARLY_WINDOW_MINUTES
) {
    const [, forceTick] = useState(0)

    useEffect(() => {
        const id = setInterval(() => forceTick(t => t + 1), 30_000)
        return () => clearInterval(id)
    }, [])

    if (!date || !startTime || !endTime) {
        return { canStart: true, minutesUntilStart: null as number | null, hasExpired: false }
    }

    const { start, end } = getShiftWindow(date, startTime, endTime, companyTimezone ?? DEFAULT_TZ)
    const now = dayjs()
    const minutesUntilStart = start.diff(now, "minute")
    const hasExpired = now.isAfter(end)

    return {
        canStart: !hasExpired && minutesUntilStart <= earlyWindowMinutes,
        minutesUntilStart,
        hasExpired,
    }
}
