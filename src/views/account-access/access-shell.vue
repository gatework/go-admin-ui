<template>
  <main
    class="login-shell"
    :style="accentColors"
    :class="[
      `login-shell-${position}`,
      { 'login-shell-registration': registration },
    ]"
  >
    <a class="login-skip" href="#login-title" @click.prevent="focusForm">{{ t('login.skipToForm') }}</a>
    <header class="login-header">
      <RouterLink class="login-brand" to="/login"><Brand /></RouterLink>
      <AppearanceToolbar :position="position" @position-change="setPosition" />
    </header>
    <section class="login-story" aria-labelledby="login-story-title">
      <AmbientBackground :centered="position === 'center'" />
      <div class="login-story-content">
        <h2 id="login-story-title">{{ t('login.story.title') }}</h2>
        <p>{{ t('login.story.description') }}</p>
        <div class="login-story-features">
          <article v-for="feature in features" :key="feature.name">
            <span
              class="login-feature-icon"
              aria-hidden="true"
            ><component :is="feature.icon" /></span>
            <div>
              <strong>{{ t(`login.story.${feature.name}`) }}</strong>
              <small>{{ t(`login.story.${feature.name}.description`) }}</small>
            </div>
          </article>
        </div>
      </div>
    </section>
    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-workspace">
        <div class="login-body">
          <div class="login-content">
            <div class="login-card">
              <header
                class="login-heading"
                :class="{ 'login-heading-with-actions': $slots.actions }"
              >
                <h1 id="login-title" ref="heading" tabindex="-1">{{ title }}</h1>
                <p v-if="description">{{ description }}</p>
                <div
                  v-if="$slots.actions"
                  class="login-heading-actions"
                ><slot name="actions" /></div>
              </header>
              <slot />
            </div>
          </div>
        </div>
      </div>
      <Footer class="login-footer" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconStorage,
  IconUserGroup,
  IconSafe,
  IconCodeSquare
} from '@arco-design/web-vue/es/icon'
import Footer from '@/components/footer/index.vue'
import Brand from '@/components/brand/index.vue'
import AppearanceToolbar from '@/views/login/components/login-appearance-settings.vue'
import AmbientBackground from '@/views/login/components/ambient-background.vue'
import { usePreferencesStore } from '@/stores/preferences'
import { resolveThemeColor } from '@/config/theme-presets'
import {
  loginAccentColors,
  readLoginAppearance,
  persistLoginAppearance,
  type LoginFormPosition
} from '@/utils/login-appearance'

defineProps<{
  title: string;
  description?: string;
  registration?: boolean;
}>()
const { t } = useI18n()
const preferences = usePreferencesStore()
const accentColors = computed(() => loginAccentColors(
  resolveThemeColor(preferences.themePreset, preferences.customThemeColor),
  preferences.darkMode
))
const heading = ref<HTMLElement>()
const focusForm = () => heading.value?.focus()
const position = ref(readLoginAppearance().formPosition)
const features = [
  { name: 'resources', icon: IconStorage },
  { name: 'permissions', icon: IconUserGroup },
  { name: 'policies', icon: IconSafe },
  { name: 'configuration', icon: IconCodeSquare }
]
function setPosition(value: LoginFormPosition) {
  position.value = value
  persistLoginAppearance({ formPosition: value })
}
</script>
<style scoped lang="scss">
  // All positions share one continuous surface and the same form geometry.
  .login-shell {
    --login-motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
    --motor-primary: var(--login-link-color);
    --color-text-3: var(--color-text-2);
    --motor-text-3: var(--color-text-2);
    --login-control-height: 36px;
    --login-label-gap: 6px;
    --login-feedback-height: calc(var(--motor-font-size-12) * 1.5);
    --login-input-surface: var(--color-fill-2);
    --login-header-height: 72px;
    --login-form-width: 420px;
    --login-page-background: var(--motor-surface);

    position: relative;
    display: grid;
    grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.1fr);
    height: 100dvh;
    overflow: hidden;
    color: var(--color-text-1);
    background: var(--login-page-background);
    isolation: isolate;
  }

  .login-shell-registration {
    --login-form-width: 460px;
    --login-label-gap: 4px;
  }

  .login-story {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 30px clamp(28px, 4vw, 64px);
    overflow: hidden;
    color: var(--color-white);
    isolation: isolate;
  }

  .login-brand {
    flex: none;
    align-self: center;
    font-size: 18px;
    color: var(--color-white);
    text-decoration: none;
  }

  .login-brand :deep(.brand__name) {
    color: inherit;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: normal;
  }

  .login-brand:focus-visible {
    outline-color: currentcolor;
  }

  .login-brand :deep(.brand__mark) {
    color: inherit;
    background: transparent;
    box-shadow: none;
    font-size: 22px;
    border-radius: var(--motor-radius-xs);
  }

  .login-story-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    max-width: 620px;
  }

  .login-story h2 {
    margin: 14px 0 16px;
    font-size: clamp(32px, 3.2vw, 50px);
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: normal;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }

  .login-story p {
    max-width: 560px;
    margin: 0;
    font-size: calc(var(--motor-font-size-14) + 1px);
    line-height: 1.8;
    opacity: 0.94;
  }

  .login-story-features {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    max-width: 580px;
    margin-top: 34px;
  }

  .login-story-features article {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    min-width: 0;
    padding: 14px 0;
    border-top: 1px solid
      color-mix(in srgb, var(--color-white) 20%, transparent);
  }

  .login-feature-icon {
    display: grid;
    flex: none;
    place-items: center;
    width: 32px;
    height: 32px;
    background: transparent;
  }

  .login-story-features article > div {
    min-width: 0;
  }

  .login-story-features strong {
    font-size: var(--motor-font-size-12);
    font-weight: 600;
  }

  .login-story-features small {
    display: block;
    margin-top: 4px;
    font-size: var(--motor-font-size-12);
    line-height: 1.5;
    opacity: 0.94;
  }

  .login-panel {
    position: relative;
    display: grid;
    grid-template-rows: var(--login-header-height) minmax(0, 1fr) auto;
    min-width: 0;
    min-height: 0;
    background: var(--login-page-background);
  }

  .login-workspace {
    grid-row: 2;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    scroll-padding-block: 32px;
    scrollbar-width: thin;
    scrollbar-color: var(--motor-border-strong) transparent;
  }

  .login-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100%;
    padding: 8px 32px;
  }

  .login-content {
    flex: none;
    width: min(var(--login-form-width), 100%);
    min-width: 0;
    margin-block: auto;
  }

  .login-header {
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    height: var(--login-header-height);
    padding-inline: clamp(24px, 4vw, 64px);
    pointer-events: none;
  }

  .login-header > * {
    pointer-events: auto;
  }

  .login-header :deep(.login-appearance) {
    flex: 1;
    max-width: 440px;
  }

  .login-shell-left .login-brand,
  .login-shell-center .login-brand {
    color: var(--color-text-1);
  }

  .login-shell-left :deep(.login-appearance),
  body[arco-theme='dark'] .login-shell-center :deep(.login-appearance) {
    --login-chrome-text: var(--color-white);
    --login-chrome-hover: color-mix(
      in srgb,
      var(--color-white) 12%,
      transparent
    );
  }

  .login-shell ::selection {
    color: var(--color-text-1);
    background: rgb(var(--primary-2));
  }

  .login-card {
    line-height: 1.5;
    color: var(--color-text-1);
    animation: login-card-arrival 240ms var(--login-motion-ease) both;
  }

  .login-heading {
    margin-bottom: 16px;
  }

  .login-shell-registration .login-heading {
    margin-bottom: 12px;
  }
  .login-heading-with-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;
  }
  .login-heading-with-actions > :not(.login-heading-actions) {
    grid-column: 1;
  }
  .login-heading-actions {
    grid-row: 1;
    grid-column: 2;
    align-self: center;
  }

  .login-heading h1 {
    margin: 8px 0 6px;
    font-size: var(--motor-font-size-24);
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: normal;
    overflow-wrap: anywhere;
  }

  .login-heading h1:first-child {
    margin-top: 0;
  }

  .login-heading p {
    margin: 0;
    font-size: var(--motor-font-size-14);
    line-height: 1.65;
    color: var(--color-text-3);
    overflow-wrap: anywhere;
  }

  .login-footer {
    position: static;
    grid-row: 3;
    min-height: 36px;
    padding: 8px 24px calc(8px + env(safe-area-inset-bottom));
    font-size: var(--motor-font-size-12);
    line-height: 1.5;
    color: var(--color-text-3);
    background: transparent;
    border: 0;
  }

  .login-skip {
    position: absolute;
    top: max(8px, env(safe-area-inset-top));
    left: max(24px, env(safe-area-inset-left));
    z-index: calc(2 + 1);
    padding: 8px 16px;
    color: var(--login-link-color);
    background: var(--color-bg-2);
    border-radius: var(--motor-radius-sm);
    transform: translateY(-200%);
  }

  .login-skip:focus-visible {
    transform: none;
  }

  .login-card :deep(.arco-form-item) {
    margin-bottom: 0;
  }

  // Each field owns room for one line of feedback; longer errors expand naturally.
  .login-card :deep(.arco-form-item-wrapper-col) {
    min-height: calc(
      var(--login-control-height) + var(--login-feedback-height)
    );
  }

  .login-card :deep(.arco-form-item-message) {
    min-height: var(--login-feedback-height);
    font-size: var(--motor-font-size-12);
    line-height: 1.5;
  }

  .login-card :deep(.arco-form-item-content) {
    flex: none;
    width: 100%;
  }

  .login-card :deep(.arco-form-item-label-col) {
    margin-bottom: var(--login-label-gap);
    line-height: 1.5;
  }

  .login-card :deep(.arco-form-item-label) {
    flex-wrap: wrap;
    align-items: baseline;
    color: var(--color-text-2);
  }

  .login-card :deep(.arco-checkbox-label) {
    color: var(--color-text-1);
  }

  .login-card :deep(.login-password-hint) {
    margin-inline-start: 8px;
    font-size: var(--motor-font-size-12);
    font-weight: 400;
    color: var(--color-text-3);
  }

  .login-card :deep(:is(.login-actions, .access-actions)) {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }

  .login-card :deep(:is(.login-actions, .access-actions) > a) {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    justify-self: center;
    max-width: 100%;
    min-height: var(--login-control-height);
    overflow-wrap: anywhere;
  }

  .login-card :deep(:is(.login-actions, .access-actions) > .arco-btn) {
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: var(--login-control-height);
    padding-block: 4px;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .login-card :deep(.login-feedback) {
    margin-bottom: 20px;
  }

  // Arco's default transition includes geometry; resizing must never animate hit areas.
  .login-card :deep(.arco-btn) {
    min-height: var(--login-control-height);
    transition-property:
      color, background-color, border-color, box-shadow, opacity, transform;
  }

  .login-card :deep(.arco-btn-primary:not(.arco-btn-disabled)) {
    color: #fff;
    background-color: var(--login-button-bg);
  }

  .login-card :deep(.arco-btn-primary:not(.arco-btn-disabled):hover) {
    background-color: var(--login-button-hover-bg);
  }

  .login-card :deep(.arco-btn-primary:not(.arco-btn-disabled):active) {
    background-color: var(--login-button-active-bg);
  }

  .login-card :deep(.arco-btn-text:not(.arco-btn-disabled)) {
    color: var(--login-link-color);
  }

  .login-card :deep(.arco-btn-text:not(.arco-btn-disabled):hover) {
    color: var(--login-link-color);
    background-color: var(--color-fill-1);
  }

  .login-card :deep(.arco-btn-text:not(.arco-btn-disabled):active) {
    color: var(--color-text-1);
    background-color: var(--color-fill-2);
  }

  .login-card :deep(a) {
    color: var(--login-link-color);
    text-decoration: none;
  }

  .login-card :deep(a:hover) {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .login-card :deep(.arco-input-wrapper) {
    min-height: var(--login-control-height);
  }

  .login-card :deep(input:is(:autofill, :-webkit-autofill)) {
    caret-color: var(--color-text-1);
    -webkit-text-fill-color: var(--color-text-1);
    box-shadow:
      inset 0 0 0 1000px var(--login-input-surface),
      inset 0 0 0 1000px var(--color-bg-2);
  }

  .login-skip:focus-visible,
  .login-card h1:focus-visible,
  .login-card :deep(a:focus-visible),
  .login-card :deep(button:focus-visible) {
    outline: 2px solid var(--motor-primary);
    outline-offset: 3px;
  }

  .login-shell-left {
    grid-template-columns: minmax(520px, 1.1fr) minmax(420px, 0.9fr);
  }

  .login-shell-left .login-story {
    order: 2;
  }

  .login-shell-center {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-shell-center .login-story {
    position: absolute;
    inset: 0;
    z-index: -1;
  }

  .login-shell-center .login-story-content {
    display: none;
  }

  @media (width > 1120px) {
    .login-shell-center .login-panel {
      background: transparent;
    }

    .login-shell-center .login-heading h1 {
      font-size: calc(var(--motor-font-size-24) + 2px);
    }

    .login-shell-center .login-heading p {
      color: var(--color-text-2);
    }

    .login-shell-center :deep(.arco-form-item-message),
    .login-shell-center :deep(.arco-form-item-label-required-symbol) {
      color: rgb(var(--danger-7));
    }

    body[arco-theme='dark'] .login-shell-center :deep(.arco-form-item-message),
    body[arco-theme='dark']
      .login-shell-center
      :deep(.arco-form-item-label-required-symbol) {
      color: rgb(var(--danger-8));
    }
  }

  @media (1120px < width <= 1360px) {
    .login-story h2 {
      font-size: 30px;
    }
  }

  @media (width <= 1120px) {
    .login-shell {
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
    }

    .login-shell .login-story {
      display: none;
    }

    .login-header:has(.login-appearance[data-palette-open='true'])
      .login-brand
      :deep(.brand__name) {
      display: none;
    }

    .login-shell .login-brand {
      color: var(--color-text-1);
    }

    .login-shell :deep(.login-appearance) {
      --login-chrome-text: initial;
      --login-chrome-hover: initial;
    }

    .login-story-content {
      display: none;
    }

    .login-shell .login-panel {
      grid-column: 1;
      background: transparent;
    }

    .login-shell .login-body {
      padding: 20px 24px;
    }
  }

  @media (width <= 520px) {
    .login-header {
      gap: 8px;
      padding-inline: 20px;
    }

    .login-brand :deep(.brand__name) {
      display: none;
    }

    .login-shell .login-body {
      padding: 16px 24px 24px;
    }

    .login-heading h1 {
      font-size: var(--motor-font-size-24);
    }

    .login-footer {
      min-height: 40px;
      padding: 8px 16px max(8px, env(safe-area-inset-bottom));
    }
  }

  @media (width <= 520px), (pointer: coarse) {
    .login-shell {
      --login-control-height: max(44px, 36px);
    }

    .login-card :deep(input.arco-input) {
      font-size: max(16px, var(--motor-font-size-14));
    }

    .login-card :deep(.arco-btn),
    .login-card :deep(:is(.login-actions, .access-actions) > a) {
      min-height: 44px;
    }
  }

  @keyframes login-card-arrival {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .login-card {
      animation: none;
    }
  }

  html[data-motion='reduced'] .login-card {
    animation: none;
  }
</style>
