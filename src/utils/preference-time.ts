/** Explicit instants follow the selected time zone; zone-less server dates keep their meaning. */
export function preferenceTime(value: string | number | Date | null | undefined, timeZone: string, pattern = '{y}-{m}-{d} {h}:{i}:{s}'): string | undefined {
  if (value == null || value === '' || (typeof value === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value))) return undefined
  const date = new Date(typeof value === 'number' && String(value).length === 10 ? value * 1000 : value)
  if (!Number.isFinite(date.getTime())) return undefined
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]))
  const values: Record<string, string> = { y: parts.year, m: parts.month, d: parts.day, h: parts.hour, i: parts.minute, s: parts.second }
  return pattern.replace(/\{([ymdhis])\}/g, (_, key: string) => values[key])
}
