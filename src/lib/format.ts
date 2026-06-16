// formatBytes renders a byte count as a binary-unit string: 1610612736 ->
// "1.5 GiB". `digits` controls decimal places (default 2). 0 -> "0 B".
export function formatBytes(bytes: number, digits = 2): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : digits)} ${units[i]}`
}

// formatDuration renders a millisecond span as a compact human string:
// 1500 -> "1s", 105000 -> "1m 45s". A null span (build still running or never
// recorded) renders as an em dash.
export function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

// formatDateTime renders an ISO timestamp the way Netlify does: "Today at
// 10:57 AM", "Yesterday at 4:12 PM", otherwise "Jun 9 at 9:03 AM" (the year is
// added only when it differs from now). Invalid input falls back to the raw
// string so a bad value never blanks the row.
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const now = new Date()
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000,
  )
  if (diffDays === 0) return `Today at ${time}`
  if (diffDays === 1) return `Yesterday at ${time}`

  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
  return `${date} at ${time}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// formatRelative renders how long ago a timestamp was, Netlify-style: "12 hours
// ago", "2 months ago", "just now". Invalid input falls back to the raw string.
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const seconds = Math.round((d.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, span] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= span) return rtf.format(Math.round(seconds / span), unit)
  }
  return 'just now'
}

// formatTimestamp renders an absolute date and time the way Netlify's audit log
// does — always month, day, and year, e.g. "Jan 24, 2025 at 11:31 AM". Invalid
// input falls back to the raw string so a bad value never blanks a row.
export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} at ${time}`
}
