<template>
  <div ref="region" class="login-appearance" :data-palette-open="paletteOpen" @pointerleave="scheduleClose">
    <div class="login-tools" role="group" :aria-label="t('settings.title')">
      <div v-if="paletteOpen" id="login-theme-colors" ref="palette" class="login-inline-palette" role="group" :aria-label="t('login.appearance.color')" @pointerenter="cancelClose" @keydown="navigatePalette">
        <button v-for="option in colors" :key="option.value" type="button" :aria-label="t(option.locale)" :title="t(option.locale)" :aria-pressed="app.themePreset === option.value" @click="selectColor(option.value)">
          <span :style="{ background: option.color, color: ['yellow', 'mint'].includes(option.value) ? '#1d2129' : '#fff' }"><icon-check v-if="app.themePreset === option.value" aria-hidden="true" /></span>
        </button>
      </div>
      <a-button ref="paletteButton" type="text" shape="square" :title="t('login.appearance.color')" :aria-label="t('login.appearance.color')" :aria-expanded="paletteOpen" aria-controls="login-theme-colors" @click="togglePalette" @pointerenter="hoverPalette" @keydown.down.prevent="openPalette(true)"><icon-palette /></a-button>
      <AppDropdown v-if="!compact" trigger="click" position="br" @select="selectPosition">
        <a-button type="text" shape="square" :title="t('login.appearance.layout')" :aria-label="t('login.appearance.layout')" @click="closePalette()"><icon-layout /></a-button>
        <template #content>
          <a-doption v-for="value in positions" :key="value" :value="value">
            <span class="login-layout-preview" :class="`is-${value}`" aria-hidden="true" />
            <span>{{ t(`login.appearance.layout.${value}`) }}</span>
            <icon-check v-if="position === value" aria-hidden="true" />
          </a-doption>
        </template>
      </AppDropdown>
      <LangSelect id="lang-select" @click="closePalette()" />
      <a-button type="text" shape="square" :title="themeLabel" :aria-label="themeLabel" :aria-pressed="app.darkMode" @click="toggleTheme"><icon-sun v-if="app.darkMode" /><icon-moon v-else /></a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button as AButton } from '@arco-design/web-vue'
import AppDropdown from '@/components/AppDropdown/index.vue'
import LangSelect from '@/components/LangSelect/index.vue'
import { THEME_PRESETS, type ThemePreset } from '@/config/theme-presets'
import { usePreferencesStore } from '@/stores/preferences'
import type { LoginFormPosition } from '@/utils/login-appearance'

defineProps<{ position: LoginFormPosition }>()
const emit = defineEmits<{ positionChange: [value: LoginFormPosition] }>()
const { t } = useI18n()
const app = usePreferencesStore()
const region = ref<HTMLElement>()
const palette = ref<HTMLElement>()
const paletteButton = ref<InstanceType<typeof AButton>>()
const paletteOpen = ref(false)
const compact = ref(false)
const colors = THEME_PRESETS.slice(0, 7)
const positions: LoginFormPosition[] = ['left', 'center', 'right']
const themeLabel = computed(() => t(app.darkMode ? 'settings.navbar.theme.toLight' : 'settings.navbar.theme.toDark'))
let hovered = false
let hoverBlockedUntil = 0
let closeTimer: ReturnType<typeof setTimeout> | undefined
let removeMedia: (() => void) | undefined
const cancelClose = () => { clearTimeout(closeTimer); closeTimer = undefined }
function closePalette(restoreFocus = false) {
  cancelClose()
  paletteOpen.value = false
  hovered = false
  if (restoreFocus) {
    hoverBlockedUntil = performance.now() + 250
    paletteButton.value?.$el.focus()
  }
}
async function openPalette(keyboard = false) {
  cancelClose()
  paletteOpen.value = true
  if (keyboard) {
    hovered = false
    await nextTick()
    const selected = palette.value?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') || palette.value?.querySelector<HTMLButtonElement>('button')
    selected?.focus()
  }
}
function togglePalette(event: MouseEvent) {
  if (paletteOpen.value && !hovered) closePalette(true)
  else { hovered = false; void openPalette(event.detail === 0) }
}
function hoverPalette(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || performance.now() < hoverBlockedUntil || !window.matchMedia('(hover: hover)').matches) return
  cancelClose()
  if (!paletteOpen.value) { hovered = true; void openPalette() }
}
function scheduleClose() {
  if (paletteOpen.value && hovered) { cancelClose(); closeTimer = setTimeout(() => closePalette(), 180) }
}
function selectColor(themePreset: ThemePreset) {
  app.updateSettings({ themePreset })
  closePalette(true)
}
function selectPosition(value: unknown) {
  if (positions.includes(value as LoginFormPosition)) emit('positionChange', value as LoginFormPosition)
}
function toggleTheme() { closePalette(); app.toggleTheme() }
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !region.value?.contains(event.target)) closePalette()
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape' && paletteOpen.value) { event.preventDefault(); closePalette(true) }
}
function navigatePalette(event: KeyboardEvent) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  cancelClose()
  hovered = false
  const buttons = Array.from(palette.value?.querySelectorAll<HTMLButtonElement>('button') || [])
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
onMounted(() => {
  const media = window.matchMedia('(max-width: 1120px)')
  const update = () => { compact.value = media.matches; closePalette() }
  update()
  media.addEventListener('change', update)
  removeMedia = () => media.removeEventListener('change', update)
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  cancelClose(); removeMedia?.()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', escape)
})
</script>

<style scoped lang="scss">
.login-appearance { --login-tool-color: var(--login-chrome-text, var(--motor-text-2)); display: flex; align-items: center; min-width: 0; }
.login-tools { display: flex; align-items: center; justify-content: flex-end; gap: 4px; width: fit-content; max-width: 100%; min-width: 0; margin-left: auto; }
.login-tools :deep(:is(.arco-btn, .header-action)) { flex: none; width: 36px; height: 36px; padding: 0; font-size: 18px; color: var(--login-tool-color); background: transparent; border: 0; border-radius: var(--motor-radius-sm); }
.login-tools :deep(:is(.arco-btn, .header-action):hover) { color: var(--login-tool-color); background: var(--login-chrome-hover, var(--color-fill-2)); }
.login-tools :deep(:is(.arco-btn, .header-action):focus-visible) { outline: 2px solid currentcolor; outline-offset: 2px; }
.login-inline-palette { display: grid; grid-template-columns: repeat(7, 32px); gap: 4px; min-width: 0; max-width: 100%; padding: 2px; overflow-x: auto; overscroll-behavior: contain; scrollbar-width: none; }
.login-inline-palette button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; }
.login-inline-palette button > span { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; font-size: var(--motor-font-size-12); }
.login-inline-palette button:hover { background: var(--color-fill-2); }
.login-inline-palette button:focus-visible { outline: 2px solid var(--login-tool-color); outline-offset: -2px; }
.login-layout-preview { position: relative; display: inline-block; width: 16px; height: 14px; margin-right: 8px; vertical-align: middle; border: 1.5px solid currentcolor; border-radius: 2px; }
.login-layout-preview::before { position: absolute; content: ''; inset: 2px auto 2px 2px; width: 4px; background: currentcolor; border-radius: 1px; }
.login-layout-preview.is-center::before { left: 50%; transform: translateX(-50%); }
.login-layout-preview.is-right::before { right: 2px; left: auto; }
@media (width <= 520px), (pointer: coarse) {
  .login-tools :deep(:is(.arco-btn, .header-action)) { width: 44px; height: 44px; }
  .login-inline-palette { grid-template-columns: repeat(7, 44px); gap: 0; }
  .login-inline-palette button { width: 44px; height: 44px; }
}
</style>
