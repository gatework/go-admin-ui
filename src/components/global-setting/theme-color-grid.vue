<template>
  <div class="theme-colors">
    <button
      v-for="option in presetOptions"
      :key="option.value"
      type="button"
      class="theme-color"
      :class="{ 'is-active': modelValue === option.value }"
      @click="$emit('change', option.value)"
    >
      <span :style="{ background: option.color }" />
      <strong>{{ t(option.locale) }}</strong>
      <icon-check-circle-fill v-if="modelValue === option.value" />
    </button>
    <label
      class="theme-color theme-color--custom"
      :class="{ 'is-active': modelValue === 'custom' }"
      @click="$emit('change', 'custom')"
    >
      <span class="theme-color__custom"><icon-palette /></span>
      <strong>{{ t('settings.theme.custom') }}</strong>
      <input
        class="theme-color__input"
        type="color"
        :value="customColor"
        :aria-label="t('settings.theme.custom')"
        @input="handleCustomColor"
      >
      <icon-check-circle-fill v-if="modelValue === 'custom'" />
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { THEME_PRESETS, type ThemePreset } from '@/config/theme-presets'

defineProps<{ modelValue: ThemePreset; customColor: string }>()
const emit = defineEmits<{
  change: [value: ThemePreset];
  customColor: [value: string];
}>()
const { t } = useI18n()
const presetOptions = computed(() =>
  THEME_PRESETS.filter((option) => option.value !== 'custom')
)

const handleCustomColor = (event: Event) => {
  emit('change', 'custom')
  emit('customColor', (event.target as HTMLInputElement).value)
}
</script>

<style scoped lang="scss">
  .theme-colors {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .theme-color {
    position: relative;
    display: grid;
    min-width: 0;
    height: 76px;
    place-items: center;
    border: 1px solid var(--motor-border);
    border-radius: var(--motor-radius-md);
    background: var(--motor-surface-soft);
    color: var(--motor-text-3);
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background-color 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease,
      box-shadow 0.16s ease;

    > span {
      display: grid;
      width: 28px;
      height: 28px;
      place-items: center;
      border-radius: var(--motor-radius-sm);
      box-shadow:
        inset 0 0 0 1px rgb(255 255 255 / 14%),
        0 5px 12px rgb(15 23 42 / 10%);
    }

    strong {
      overflow: hidden;
      max-width: 100%;
      font-size: var(--motor-font-size-11);
      font-weight: 580;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    > .arco-icon {
      position: absolute;
      top: 6px;
      right: 6px;
      color: var(--motor-primary);
    }

    &:hover {
      border-color: color-mix(
        in srgb,
        var(--motor-primary) 42%,
        var(--motor-border)
      );
      color: var(--motor-text-1);
      box-shadow: 0 8px 18px rgb(15 23 42 / 7%);
      transform: translateY(-2px);
    }

    &:focus-visible {
      outline: 2px solid var(--motor-primary);
      outline-offset: 3px;
    }

    &--custom {
      cursor: pointer;
    }

    &--custom:focus-within {
      outline: 2px solid var(--motor-primary);
      outline-offset: 3px;
    }

    &.is-active {
      border-color: var(--motor-primary);
      background: var(--motor-primary-soft);
      color: var(--motor-primary);
      box-shadow: inset 0 0 0 1px var(--motor-primary);
    }

    &:active {
      transform: scale(0.97);
    }

    &__custom {
      position: relative;
      overflow: hidden;
      border: 1px dashed var(--motor-border-strong);
      background: var(--motor-surface) !important;
      box-shadow: none !important;
      font-size: var(--motor-font-size-17);

      input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        opacity: 0;
        cursor: pointer;
      }
    }

    &__input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      opacity: 0;
    }
  }
</style>
