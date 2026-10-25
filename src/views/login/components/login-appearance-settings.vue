<template>
  <div
    class="login-color-picker"
    role="group"
    :aria-label="$t('login.appearance.color')"
  >
    <div class="login-color-picker__swatches">
      <button
        v-for="option in colorOptions"
        :key="option.value"
        type="button"
        class="login-color-option"
        :class="{
          'login-color-option--active': appStore.themePreset === option.value,
        }"
        :style="{ '--login-color': option.color }"
        :aria-label="$t(option.locale)"
        :aria-pressed="appStore.themePreset === option.value"
        @click="setColor(option.value)"
      >
        <icon-check v-if="appStore.themePreset === option.value" />
      </button>
    </div>
    <HeaderIconButton :aria-label="$t('login.appearance.color')" motion="pulse">
      <icon-palette />
    </HeaderIconButton>
  </div>
  <AppDropdown trigger="click" position="br">
    <HeaderIconButton
      :tooltip="$t('login.appearance.layout')"
      :aria-label="$t('login.appearance.layout')"
      motion="lift"
    >
      <icon-layout />
    </HeaderIconButton>
    <template #content>
      <section class="login-appearance-menu login-appearance-menu--layout">
        <p class="login-appearance-menu__label">
          {{ $t('login.appearance.layout') }}
        </p>
        <div class="login-appearance-menu__layouts" role="group">
          <button
            v-for="option in layoutOptions"
            :key="option.value"
            type="button"
            class="login-layout-option"
            :class="{
              'login-layout-option--active':
                appearance.formPosition === option.value,
            }"
            :aria-label="$t(option.label)"
            :aria-pressed="appearance.formPosition === option.value"
            @click="setPosition(option.value)"
          >
            <span
              class="login-layout-option__preview"
              :class="`login-layout-option__preview--${option.value}`"
              aria-hidden="true"
            ><i /><b /></span>
            <strong>{{ $t(option.label) }}</strong>
          </button>
        </div>
      </section>
    </template>
  </AppDropdown>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import { THEME_PRESETS, type ThemePreset } from '@/config/theme-presets'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import {
  persistLoginAppearance,
  readLoginAppearance,
  type LoginFormPosition
} from '@/utils/login-appearance'

const appStore = useAppStore()
const appearance = ref(readLoginAppearance())
const loginColorPresets: ThemePreset[] = [
  'default',
  'violet',
  'pink',
  'yellow',
  'sky',
  'mint',
  'zinc'
]
const colorOptions = THEME_PRESETS.filter(
  (option): option is (typeof THEME_PRESETS)[number] & { color: string } =>
    loginColorPresets.includes(option.value) && Boolean(option.color)
)
const layoutOptions: Array<{
  value: LoginFormPosition;
  label: string;
}> = [
  { value: 'left', label: 'login.appearance.layout.left' },
  { value: 'center', label: 'login.appearance.layout.center' },
  { value: 'right', label: 'login.appearance.layout.right' }
]

const setPosition = (formPosition: LoginFormPosition) => {
  appearance.value = { formPosition }
  persistLoginAppearance(appearance.value)
  window.dispatchEvent(
    new CustomEvent<LoginFormPosition>('motor:login-form-position', {
      detail: formPosition
    })
  )
}
const setColor = (themePreset: ThemePreset) =>
  appStore.updateSettings({ themePreset })
</script>

<style lang="scss" scoped>
  .login-appearance-menu {
    width: 278px;
    padding: 16px;
  }
  .login-appearance-menu--layout {
    width: 300px;
  }
  .login-appearance-menu__label {
    margin: 0 0 10px;
    color: var(--motor-text-3);
    font-size: var(--motor-font-size-11);
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .login-appearance-menu__layouts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 18px;
  }
  .login-layout-option {
    display: grid;
    gap: 7px;
    justify-items: center;
    padding: 8px 4px;
    border: 1px solid var(--motor-border);
    border-radius: var(--motor-radius-sm);
    background: var(--motor-surface-soft);
    color: var(--motor-text-2);
    cursor: pointer;
    font-size: var(--motor-font-size-11);
    transition:
      border-color 0.16s ease,
      background-color 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;

    &:hover,
    &--active {
      border-color: var(--motor-primary);
      color: var(--motor-primary);
    }
    &--active {
      background: var(--motor-primary-soft);
    }
    &:focus-visible {
      outline: 2px solid var(--motor-primary);
      outline-offset: 2px;
    }
    &:active {
      transform: scale(0.97);
    }
  }
  .login-layout-option__preview {
    display: flex;
    width: 48px;
    height: 28px;
    padding: 3px;
    gap: 3px;
    border: 1px solid currentcolor;
    border-radius: 4px;
    opacity: 0.82;

    i,
    b {
      display: block;
      border-radius: 1px;
    }
    i {
      flex: 1;
      background: color-mix(in srgb, currentcolor 20%, transparent);
    }
    b {
      width: 14px;
      background: currentcolor;
    }
    &--left {
      flex-direction: row-reverse;
    }
    &--center {
      justify-content: center;
      i {
        display: none;
      }
      b {
        width: 21px;
      }
    }
  }
  .login-color-picker {
    display: flex;
    height: 32px;
    align-items: center;
    border-radius: 999px;

    &:hover,
    &:focus-within {
      padding-left: 6px;
    }

    :deep(.header-action) {
      flex: 0 0 32px;
    }
  }
  .login-color-picker__swatches {
    display: none;
    align-items: center;
    gap: 8px;
    padding-right: 8px;

    .login-color-picker:hover &,
    .login-color-picker:focus-within & {
      display: flex;
    }
  }
  .login-color-option {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 2px solid transparent;
    border-radius: 50%;
    background: var(--login-color);
    color: #fff;
    cursor: pointer;

    &:hover {
      transform: scale(1.12);
    }
    &--active {
      border-color: var(--motor-surface);
      box-shadow: 0 0 0 2px var(--login-color);
    }
    &:focus-visible {
      outline: 2px solid var(--motor-primary);
      outline-offset: 3px;
    }
    &:active {
      transform: scale(0.92);
    }
  }
  @media (width <= 520px) {
    .login-appearance-menu {
      width: min(300px, calc(100vw - 24px));
    }
    .login-color-option {
      width: 22px;
      height: 22px;
    }
  }
</style>
