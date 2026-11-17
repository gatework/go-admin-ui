import { FONT_SIZE_RANGE, MENU_WIDTH_RANGE, RADIUS_STEPS } from '@/stores/preferences'
import type { UiPreferences } from '@/types/preferences'

/**
 * What the preferences drawer shows, as data.
 *
 * The drawer renders this list; it has no per-option template. Adding a
 * preference means a key in config/preferences.json, its type in
 * types/preferences.ts, and one entry here.
 *
 * `label`, `description` and option labels are i18n keys.
 */
interface FieldBase {
  key: keyof UiPreferences
  label: string
  description?: string
  /** Hide the field unless this holds, e.g. an option that only applies to one layout. */
  when?: (preferences: UiPreferences) => boolean
}
export interface SwitchField extends FieldBase { control: 'switch' }
export interface ChoiceField extends FieldBase {
  control: 'segmented' | 'select'
  /** `label` is an i18n key unless `raw` is set, in which case it is shown as written. */
  options: Array<{ value: string | number, label: string, raw?: boolean }>
}
export interface NumberField extends FieldBase { control: 'number', min: number, max: number, step: number, unit?: string }
/** The preset grid: writes `themePreset` and, for a custom pick, `customThemeColor`. */
export interface ThemeColorField extends FieldBase { control: 'theme-color' }

export type PreferenceField = SwitchField | ChoiceField | NumberField | ThemeColorField
export interface PreferenceGroup { id: 'appearance' | 'layout' | 'general', title: string, fields: PreferenceField[] }

const TIME_ZONES = ['Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC']

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    id: 'appearance',
    title: 'settings.tab.appearance',
    fields: [
      {
        key: 'theme', control: 'segmented', label: 'settings.preference.theme',
        options: [
          { value: 'light', label: 'settings.preference.light' },
          { value: 'dark', label: 'settings.preference.dark' },
          { value: 'system', label: 'settings.preference.system' }
        ]
      },
      { key: 'themePreset', control: 'theme-color', label: 'settings.theme.builtin' },
      { key: 'radius', control: 'segmented', label: 'settings.theme.radius', options: RADIUS_STEPS.map(value => ({ value, label: String(value), raw: true })) },
      { key: 'fontSize', control: 'number', label: 'settings.theme.fontSize', min: FONT_SIZE_RANGE[0], max: FONT_SIZE_RANGE[1], step: 1, unit: 'px' },
      {
        key: 'density', control: 'segmented', label: 'settings.preference.density', description: 'settings.preference.density.description',
        options: [
          { value: 'comfortable', label: 'settings.preference.comfortable' },
          { value: 'compact', label: 'settings.preference.compact' }
        ]
      }
    ]
  },
  {
    id: 'layout',
    title: 'settings.tab.layout',
    fields: [
      {
        key: 'layoutMode', control: 'segmented', label: 'settings.layout.navigation',
        options: [
          { value: 'vertical', label: 'settings.layout.vertical' },
          { value: 'horizontal', label: 'settings.layout.horizontal' }
        ]
      },
      {
        key: 'contentWidth', control: 'segmented', label: 'settings.layout.content',
        options: [
          { value: 'fluid', label: 'settings.layout.fluid' },
          { value: 'fixed', label: 'settings.layout.fixed' }
        ]
      },
      { key: 'semiDarkSidebar', control: 'switch', label: 'settings.theme.semiDarkSidebar', when: preferences => preferences.layoutMode === 'vertical' },
      { key: 'menuCollapse', control: 'switch', label: 'settings.preference.sidebar', description: 'settings.preference.sidebar.description', when: preferences => preferences.layoutMode === 'vertical' },
      { key: 'menuWidth', control: 'number', label: 'settings.layout.sidebar.width', min: MENU_WIDTH_RANGE[0], max: MENU_WIDTH_RANGE[1], step: 8, unit: 'px', when: preferences => preferences.layoutMode === 'vertical' },
      { key: 'tabBar', control: 'switch', label: 'settings.tabBar', description: 'settings.preference.tabs.description' },
      { key: 'tabPersist', control: 'switch', label: 'settings.layout.tabs.persist', when: preferences => preferences.tabBar }
    ]
  },
  {
    id: 'general',
    title: 'settings.tab.general',
    fields: [
      { key: 'timeZone', control: 'select', label: 'settings.general.timeZone', options: TIME_ZONES.map(value => ({ value, label: value, raw: true })) },
      { key: 'dynamicTitle', control: 'switch', label: 'settings.general.dynamicTitle' },
      { key: 'pageTransition', control: 'switch', label: 'settings.general.transition', description: 'settings.general.transition.description' },
      { key: 'shortcutEnabled', control: 'switch', label: 'settings.shortcut.enable', description: 'settings.shortcut.enable.description' }
    ]
  }
]
