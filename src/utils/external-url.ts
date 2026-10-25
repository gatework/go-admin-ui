export const isSafeExternalUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value || value.length > 240) return false

  try {
    const url = new URL(value)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export const isOptionalExternalUrl = (value: unknown): value is string =>
  value === '' || isSafeExternalUrl(value)
