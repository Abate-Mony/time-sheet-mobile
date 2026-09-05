import dayjs from "dayjs"

export function minutesToHours(minutes: number | null | undefined): number {
    return Number(((minutes ?? 0) / 60).toFixed(0))
}

export function formatDuration(minutes: number | null | undefined): string {
    const total = Math.max(Math.round(minutes ?? 0), 0)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h === 0) return `${m}m`
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatSecondsAsClock(seconds: number) {
    const total = Math.max(Math.round(seconds), 0)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return {
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
    }
}

export function formatSecondsAsDuration(seconds: number): string {
    return formatDuration(seconds / 60)
}

export function formatDate(date: string | Date | undefined, pattern = "ddd, D MMM"): string {
    if (!date) return "Date TBC"
    return dayjs(date).format(pattern)
}
