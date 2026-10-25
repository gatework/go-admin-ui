export const LOGIN_APPEARANCE_STORAGE_KEY = 'motor-admin-login-appearance'

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
