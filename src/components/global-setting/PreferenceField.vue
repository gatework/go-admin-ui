<template>
  <ThemeColorGrid
    v-if="field.control === 'theme-color'"
    class="preference-field__grid"
    :model-value="preferences.themePreset"
    :custom-color="preferences.customThemeColor"
    @change="preferences.updateSettings({ themePreset: $event })"
    @custom-color="preferences.updateSettings({ customThemeColor: $event, themePreset: 'custom' })"
  />
  <div v-else class="preference-field" :class="`preference-field--${field.control}`">
    <div :id="labelId" class="preference-field__copy">
      <span>{{ $t(field.label) }}</span>
      <small v-if="field.description">{{ $t(field.description) }}</small>
    </div>
    <a-switch v-if="field.control === 'switch'" :model-value="Boolean(value)" :aria-labelledby="labelId" @change="set(Boolean($event))" />
    <a-radio-group v-else-if="field.control === 'segmented'" type="button" :model-value="value" :aria-labelledby="labelId" @change="set($event)">
      <a-radio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.raw ? option.label : $t(option.label) }}</a-radio>
    </a-radio-group>
    <a-select v-else-if="field.control === 'select'" class="preference-field__select" :model-value="value" :aria-labelledby="labelId" allow-search @change="set($event)">
      <a-option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.raw ? option.label : $t(option.label) }}</a-option>
    </a-select>
    <a-input-number
      v-else-if="field.control === 'number'"
      class="preference-field__number"
      mode="button"
      :model-value="Number(value)"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      :input-attrs="{ 'aria-labelledby': labelId }"
      @change="value => typeof value === 'number' && set(value)"
    >
      <template v-if="field.unit" #suffix>{{ field.unit }}</template>
    </a-input-number>
  </div>
</template>

<script setup lang="ts">
/** One row of the preferences drawer: a label, and the Arco control its schema entry names. */
import { computed, useId } from 'vue'
import ThemeColorGrid from './theme-color-grid.vue'
import { usePreferencesStore } from '@/stores/preferences'
import type { PreferenceField } from '@/config/preference-schema'

defineOptions({ name: 'PreferenceField' })
const props = defineProps<{ field: PreferenceField }>()

const preferences = usePreferencesStore()
const labelId = useId()
const value = computed(() => preferences[props.field.key] as string | number | boolean)
// The store validates every write, so an out-of-range value is dropped there rather than checked here.
const set = (next: unknown) => preferences.updateSettings({ [props.field.key]: next })
</script>

<style lang="scss" scoped>
.preference-field {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  &__copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    color: var(--motor-text-1);

    small { margin-top: 2px; color: var(--motor-text-3); font-size: var(--motor-font-size-12); line-height: 1.5; }
  }

  &__select { width: 200px; flex-shrink: 0; }
  &__number { width: 132px; flex-shrink: 0; }
  :deep(.arco-radio-group-button) { flex-shrink: 0; }
}

.preference-field__grid { margin: 4px 0 8px; }
</style>
