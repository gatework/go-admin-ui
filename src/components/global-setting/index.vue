<template>
  <AppDrawer
    v-model:visible="preferences.globalSettings"
    class="preferences-drawer"
    :title="t('settings.title')"
    size="sm"
    :footer="false"
    @open="scrollToRequested"
  >
    <div ref="body" class="preferences">
      <section v-for="group in groups" :id="`preferences-${group.id}`" :key="group.id" class="preferences__group">
        <h3>{{ t(group.title) }}</h3>
        <PreferenceField v-for="field in group.fields" :key="field.key" :field="field" />
        <div v-if="group.id === 'general' && !localeFixed" class="preferences__row">
          <span :id="localeLabel">{{ t('layout.language') }}</span>
          <a-select class="preferences__select" :model-value="locale" :aria-labelledby="localeLabel" @change="changeLocale">
            <a-option v-for="option in LOCALES" :key="option.value" :value="option.value">{{ option.label }}</a-option>
          </a-select>
        </div>
      </section>

      <section v-if="preferences.shortcutEnabled" class="preferences__group">
        <h3>{{ t('settings.tab.shortcuts') }}</h3>
        <div v-for="shortcut in SHORTCUTS" :key="shortcut.label" class="preferences__row">
          <span>{{ t(shortcut.label) }}</span>
          <span class="preferences__keys"><kbd v-for="key in shortcut.keys" :key="key">{{ keyLabel(key) }}</kbd></span>
        </div>
      </section>

      <section id="preferences-lock" class="preferences__group">
        <h3>{{ t('settings.lock.title') }}</h3>
        <LockSettings />
      </section>

      <a-button class="preferences__reset" long @click="reset">
        <template #icon><icon-refresh /></template>{{ t('settings.preference.reset') }}
      </a-button>
    </div>
  </AppDrawer>
</template>

<script setup lang="ts">
/**
 * The preferences drawer.
 *
 * Its options come from config/preference-schema.ts and are drawn by
 * PreferenceField, so this file holds only what is not a stored preference:
 * the language (owned by src/lang), the shortcut reference, the screen lock and
 * the reset.
 */
import { computed, nextTick, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDrawer from '@/components/AppDrawer/index.vue'
import LockSettings from './LockSettings.vue'
import PreferenceField from './PreferenceField.vue'
import { requestedPreferenceSection } from './requested-section'
import { PREFERENCE_GROUPS } from '@/config/preference-schema'
import { LOCALES, fixedLocale, setLocale, type Locale } from '@/lang'
import { SHORTCUTS, keyLabel } from '@/layout/composables/useShortcuts'
import { usePreferencesStore } from '@/stores/preferences'
import { msgError, msgSuccess } from '@/utils/message'
import { confirmAction } from '@/utils/modal'

defineOptions({ name: 'GlobalSetting' })

const { t, locale } = useI18n()
const preferences = usePreferencesStore()
const body = ref<HTMLElement>()
const localeLabel = useId()
const localeFixed = Boolean(fixedLocale())

const groups = computed(() => PREFERENCE_GROUPS.map(group => ({
  ...group,
  fields: group.fields.filter(field => !field.when || field.when(preferences))
})))

const changeLocale = async(value: unknown) => {
  try { await setLocale(value as Locale) } catch { msgError(t('layout.languageFailed')) }
}

const reset = async() => {
  try {
    await confirmAction({
      title: t('settings.preference.reset.confirm.title'),
      content: t('settings.preference.reset.confirm.description'),
      okText: t('settings.preference.reset.confirm.action')
    })
  } catch { return }
  preferences.resetPreferences()
  msgSuccess(t('settings.preference.reset.success'))
}

/** Something outside asked for a section (the lock shortcut, before a password exists). */
const scrollToRequested = async() => {
  const section = requestedPreferenceSection.value
  requestedPreferenceSection.value = undefined
  if (!section) return
  await nextTick()
  body.value?.querySelector(`#preferences-${section}`)?.scrollIntoView({ block: 'start' })
}
</script>

<style lang="scss" scoped>
.preferences {
  display: flex;
  flex-direction: column;
  gap: 24px;

  &__group {
    display: flex;
    flex-direction: column;
    gap: 4px;

    h3 {
      margin: 0 0 8px;
      color: var(--motor-text-3);
      font-size: var(--motor-font-size-12);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
  }

  &__row {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: var(--motor-text-1);
  }

  &__select { width: 200px; flex-shrink: 0; }

  &__keys {
    display: flex;
    gap: 4px;

    kbd {
      min-width: 24px;
      padding: 2px 6px;
      border: 1px solid var(--motor-border);
      border-radius: 4px;
      background: var(--motor-surface-soft);
      color: var(--motor-text-2);
      font-family: inherit;
      font-size: var(--motor-font-size-12);
      text-align: center;
    }
  }
}
</style>
