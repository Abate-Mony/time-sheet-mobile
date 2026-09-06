import dayjs from "dayjs"
import { useEffect, useState } from "react"

const DEFAULT_EARLY_WINDOW_MINUTES = 30

function getShiftWindow(date: string, startTime: string, endTime: string) {
    const dateStr = dayjs(date).format("YYYY-MM-DD")
    const start = dayjs(`${dateStr} ${startTime}`)
    let end = dayjs(`${dateStr} ${endTime}`)
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

    const { start, end } = getShiftWindow(date, startTime, endTime)
    const now = dayjs()
    const minutesUntilStart = start.diff(now, "minute")
    const hasExpired = now.isAfter(end)

    return {
        canStart: !hasExpired && minutesUntilStart <= earlyWindowMinutes,
        minutesUntilStart,
        hasExpired,
    }
}
