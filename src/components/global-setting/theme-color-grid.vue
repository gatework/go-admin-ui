<template>
  <div class="theme-colors" role="radiogroup" :aria-label="t('settings.theme.builtin')">
    <a-tooltip v-for="option in presets" :key="option.value" :content="t(option.locale)" mini>
      <button
        type="button"
        role="radio"
        class="theme-color"
        :class="{ 'is-active': modelValue === option.value }"
        :aria-checked="modelValue === option.value"
        :aria-label="t(option.locale)"
        :style="{ '--swatch': option.color }"
        @click="$emit('change', option.value)"
      >
        <icon-check v-if="modelValue === option.value" />
      </button>
    </a-tooltip>
    <a-tooltip :content="t('settings.theme.custom')" mini>
      <label class="theme-color theme-color--custom" :class="{ 'is-active': modelValue === 'custom' }" :style="{ '--swatch': customColor }">
        <icon-check v-if="modelValue === 'custom'" /><icon-palette v-else />
        <input type="color" :value="customColor" :aria-label="t('settings.theme.custom')" @input="pickCustom">
      </label>
    </a-tooltip>
  </div>
</template>

<script lang="ts" setup>
/** The accent colour: a row of preset swatches and one that opens the system colour picker. */
import { useI18n } from 'vue-i18n'
import { THEME_PRESETS, type ThemePreset } from '@/config/theme-presets'

defineProps<{ modelValue: ThemePreset, customColor: string }>()
const emit = defineEmits<{ change: [value: ThemePreset], customColor: [value: string] }>()
const { t } = useI18n()
const presets = THEME_PRESETS.filter(option => option.value !== 'custom')

const pickCustom = (event: Event) => emit('customColor', (event.target as HTMLInputElement).value)
</script>

<style scoped lang="scss">
.theme-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.theme-color {
  position: relative;
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--swatch);
  color: #fff;
  font-size: var(--motor-font-size-14);
  cursor: pointer;
  transition: box-shadow var(--motor-duration);

  &:hover,
  &.is-active { box-shadow: 0 0 0 2px var(--motor-surface), 0 0 0 4px var(--swatch); }

  input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
}
</style>
