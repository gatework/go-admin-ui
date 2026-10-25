export type ThemePreset =
  | 'default'
  | 'violet'
  | 'pink'
  | 'yellow'
  | 'sky'
  | 'mint'
  | 'zinc'
  | 'teal'
  | 'deep-blue'
  | 'orange'
  | 'red'
  | 'neutral'
  | 'slate'
  | 'gray'
  | 'custom'

export interface ThemePresetOption {
  value: ThemePreset;
  locale: string;
  color?: string;
}

export const THEME_PRESETS: ThemePresetOption[] = [
  { value: 'default', locale: 'settings.theme.default', color: '#1677ff' },
  { value: 'violet', locale: 'settings.theme.violet', color: '#7c5ce7' },
  { value: 'pink', locale: 'settings.theme.pink', color: '#ef476f' },
  { value: 'yellow', locale: 'settings.theme.yellow', color: '#f6bd3f' },
  { value: 'sky', locale: 'settings.theme.sky', color: '#4f67ff' },
  { value: 'mint', locale: 'settings.theme.mint', color: '#16c79a' },
  { value: 'zinc', locale: 'settings.theme.zinc', color: '#52525b' },
  { value: 'teal', locale: 'settings.theme.teal', color: '#179c9f' },
  { value: 'deep-blue', locale: 'settings.theme.deepBlue', color: '#146bc6' },
  { value: 'orange', locale: 'settings.theme.orange', color: '#d94801' },
  { value: 'red', locale: 'settings.theme.red', color: '#dc2026' },
  { value: 'neutral', locale: 'settings.theme.neutral', color: '#525252' },
  { value: 'slate', locale: 'settings.theme.slate', color: '#3d4e68' },
  { value: 'gray', locale: 'settings.theme.gray', color: '#475569' },
  { value: 'custom', locale: 'settings.theme.custom' }
]

export const resolveThemeColor = (preset: ThemePreset, customColor: string) =>
  preset === 'custom'
    ? customColor
    : THEME_PRESETS.find((option) => option.value === preset)?.color ||
      '#1677ff'
