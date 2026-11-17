/** Shown where a value is missing, so an empty cell is distinguishable from one still loading. */
export const EMPTY = '—'

/** `value`, or the em dash when there is nothing to show. Zero and `false` are values. */
export const display = (value: unknown): string =>
  value === undefined || value === null || value === '' ? EMPTY : String(value)
