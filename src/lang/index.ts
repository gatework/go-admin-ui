import { createI18n } from 'vue-i18n'
import { shallowRef } from 'vue'
import arcoZhCn from '@arco-design/web-vue/es/locale/lang/zh-cn'
import zhCN from './zh-CN'
import { DEFAULT_LOCALE, fixedLocale, initialLocale, rememberLocale, type Locale } from './locales'

/**
 * The i18n instance, and the one function that changes language.
 *
 * Only zh-CN is bundled into the entry: it is the default and the fallback, so
 * it is needed either way, and bundling the others would put every translation
 * of a page nobody opened into the first paint. The rest arrive through
 * `import()`, which Vite splits into their own chunks -- see
 * scripts/check-first-paint.mjs for the budget this protects.
 *
 * `legacy: false` is what makes switching work without a reload: only in
 * Composition mode is `locale` a real ref, so assigning to it re-renders
 * everything that read a translation. `globalInjection` keeps `$t()` working in
 * the Options-API pages that have not been migrated yet, so the two migrations
 * (Options -> Composition, Chinese -> i18n) do not block each other.
 */

const messageLoaders: Record<Locale, () => Promise<Record<string, unknown>>> = {
  'zh-CN': () => Promise.resolve(zhCN),
  'en-US': () => import('./en-US').then(module => module.default)
}

export const arcoLocale = shallowRef(arcoZhCn)
const arcoLoaders: Record<Locale, () => Promise<typeof arcoZhCn>> = {
  'zh-CN': () => Promise.resolve(arcoZhCn),
  'en-US': () => import('@arco-design/web-vue/es/locale/lang/en-us').then(module => module.default)
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: { [DEFAULT_LOCALE]: zhCN }
})

/** The current language, reactive. For code outside a component. */
export const currentLocale = (): Locale => i18n.global.locale.value as Locale

/**
 * Switches language, loading whatever that language needs first.
 *
 * Both loads are awaited before `locale` is assigned so the interface never
 * renders half-translated -- a frame with English labels and a Chinese date
 * picker is worse than a frame of the old language.
 */
export const setLocale = async(locale: Locale): Promise<void> => {
  if (!i18n.global.availableLocales.includes(locale)) {
    i18n.global.setLocaleMessage(locale, await messageLoaders[locale]())
  }
  arcoLocale.value = await arcoLoaders[locale]()

  i18n.global.locale.value = locale
  /*
   * Only a choice the visitor made is worth remembering. A pinned build offers
   * no choice, and storing its language would outlive the pin: unset
   * VUE_APP_LOCALE later and everyone who ever loaded the site stays in a
   * language they never picked, with the switcher back but already answered.
   */
  if (!fixedLocale()) rememberLocale(locale)
  // Screen readers pick pronunciation from this, and CSS :lang() selectors key
  // off it. Nothing in the app reads it back.
  document.documentElement.lang = locale
}

/** Called once at boot, before mount, so the first paint is already correct. */
export const setupI18n = (): Promise<void> => setLocale(initialLocale())

export * from './locales'
