import { generate } from '@arco-design/color'

export const LOGIN_APPEARANCE_STORAGE_KEY = 'motor-admin-login-appearance'

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

/** Use shades of the saved palette without changing the global preference. */
export const loginAccentColors = (color: string, dark: boolean) => {
  const palette = generate(color, { list: true })
  const index = palette.findIndex((tone, i) => i >= 5 && contrast(tone, '#ffffff') >= 5)
  const base = index < 0 ? palette.length - 1 : index
  const shade = (offset: number) => palette[Math.min(base + offset, palette.length - 1)]
  const darkLink = generate(color, { list: true, dark: true })
    .find((tone, i) => i >= 5 && contrast(tone, '#2c2c2c') >= 4.5) || '#ffffff'
  return {
    '--login-button-bg': shade(0),
    '--login-button-hover-bg': shade(1),
    '--login-button-active-bg': shade(2),
    '--login-link-color': dark ? darkLink : shade(1),
    '--login-story-accent': palette.find((tone, i) => i >= 5 && contrast(tone, '#ffffff') >= 6) || shade(2)
  }
}

export type LoginFormPosition = 'left' | 'center' | 'right'

export interface LoginAppearance {
  formPosition: LoginFormPosition;
}

const DEFAULT_APPEARANCE: LoginAppearance = {
  formPosition: 'right'
}

const isFormPosition = (value: unknown): value is LoginFormPosition =>
  value === 'left' || value === 'center' || value === 'right'

export const readLoginAppearance = (
  storage?: Pick<Storage, 'getItem'>
): LoginAppearance => {
  try {
    const raw = (storage ?? localStorage).getItem(LOGIN_APPEARANCE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }

    const stored = JSON.parse(raw) as Partial<LoginAppearance>
    return {
      formPosition: isFormPosition(stored.formPosition)
        ? stored.formPosition
        : DEFAULT_APPEARANCE.formPosition
    }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export const persistLoginAppearance = (
  appearance: LoginAppearance,
  storage?: Pick<Storage, 'setItem'>
) => {
  try {
    ;(storage ?? localStorage).setItem(
      LOGIN_APPEARANCE_STORAGE_KEY,
      JSON.stringify({
        formPosition: isFormPosition(appearance.formPosition)
          ? appearance.formPosition
          : DEFAULT_APPEARANCE.formPosition
      })
    )
  } catch { /* Layout still applies when storage is restricted. */ }
}
