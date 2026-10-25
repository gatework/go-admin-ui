<template>
  <main class="login-page" :class="`login-page--form-${formPosition}`">
    <section class="login-story">
      <RouterLink class="login-story__brand" to="/login"><Brand /></RouterLink>
      <div class="login-story__content">

        <h1>{{ $t('login.story.title') }}</h1>
        <p>{{ $t('login.story.description') }}</p>
        <div class="login-story__features">
          <article v-for="feature in features" :key="feature.title">
            <span><component :is="feature.icon" /></span>
            <div><strong>{{ $t(feature.title) }}</strong><small>{{ $t(feature.description) }}</small></div>
          </article>
        </div>
      </div>
      <div class="login-story__orb login-story__orb--one" />
      <div class="login-story__orb login-story__orb--two" />
    </section>

    <section class="login-panel">
      <div class="login-panel__tools">
        <LoginAppearanceSettings />
        <SwitchLocale id="lang-select" />
        <HeaderIconButton
          :tooltip="themeLabel"
          :aria-label="themeLabel"
          motion="spin"
          @click="appStore.toggleTheme()"
        >
          <icon-sun-fill v-if="appStore.darkMode" /><icon-moon-fill v-else />
        </HeaderIconButton>
      </div>
      <div class="login-panel__form"><LoginForm /></div>
      <Footer class="login-panel__footer" />
    </section>
  </main>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconCodeSquare,
  IconSafe,
  IconStorage,
  IconUserGroup
} from '@arco-design/web-vue/es/icon'
import Footer from '@/components/footer/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import SwitchLocale from '@/components/LangSelect/index.vue'
import Brand from '@/components/brand/index.vue'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import LoginForm from './components/login-form.vue'
import LoginAppearanceSettings from './components/login-appearance-settings.vue'
import {
  readLoginAppearance,
  type LoginFormPosition
} from '@/utils/login-appearance'

const { t } = useI18n()
const appStore = useAppStore()
const formPosition = ref<LoginFormPosition>(
  readLoginAppearance().formPosition
)
const themeLabel = computed(() =>
  appStore.darkMode
    ? t('settings.navbar.theme.toLight')
    : t('settings.navbar.theme.toDark')
)
const features = [
  {
    icon: IconStorage,
    title: 'login.story.resources',
    description: 'login.story.resources.description'
  },
  {
    icon: IconUserGroup,
    title: 'login.story.permissions',
    description: 'login.story.permissions.description'
  },
  {
    icon: IconSafe,
    title: 'login.story.policies',
    description: 'login.story.policies.description'
  },
  {
    icon: IconCodeSquare,
    title: 'login.story.configuration',
    description: 'login.story.configuration.description'
  }
]
const updateFormPosition = (event: Event) => {
  formPosition.value = (event as CustomEvent<LoginFormPosition>).detail
}
onMounted(() =>
  window.addEventListener('motor:login-form-position', updateFormPosition)
)
onUnmounted(() =>
  window.removeEventListener('motor:login-form-position', updateFormPosition)
)
</script>

<style lang="scss" scoped>
  .login-page {
    display: grid;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden auto;
    grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.1fr);
    background: var(--motor-surface);
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
  .login-story {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 100%;
    overflow: hidden;
    flex-direction: column;
    padding: 30px clamp(28px, 4vw, 64px);
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--motor-primary) 22%, #081229) 0%,
      color-mix(in srgb, var(--motor-primary) 54%, #081229) 48%,
      var(--motor-primary) 100%
    );
    color: #fff;
  }
  .login-story::after {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgb(255 255 255 / 5%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 5%) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(to bottom, black, transparent 80%);
    content: '';
  }
  .login-story__brand {
    position: relative;
    z-index: 2;
    align-self: flex-start;
    text-decoration: none;
  }
  .login-story__brand :deep(.brand__name) {
    color: #fff;
  }
  .login-story__content {
    position: relative;
    z-index: 2;
    display: flex;
    max-width: 620px;
    flex: 1;
    justify-content: center;
    flex-direction: column;
  }
  .login-story__eyebrow {
    color: rgb(255 255 255 / 62%);
    font-size: var(--motor-font-size-11);
    font-weight: 700;
    letter-spacing: 0.18em;
  }
  .login-story h1 {
    max-width: none;
    margin: 14px 0 16px;
    font-size: clamp(var(--motor-font-size-32), 3.2vw, 50px);
    letter-spacing: -0.04em;
    line-height: 1.08;
    overflow-wrap: anywhere;
    white-space: normal;
  }
  .login-story p {
    max-width: 560px;
    margin: 0;
    color: rgb(255 255 255 / 72%);
    font-size: var(--motor-font-size-15);
    line-height: 1.8;
  }
  .login-story__features {
    display: grid;
    max-width: 580px;
    margin-top: 34px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .login-story__features article {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
    border: 1px solid rgb(255 255 255 / 13%);
    border-radius: var(--motor-radius-lg);
    background: rgb(255 255 255 / 7%);
    backdrop-filter: blur(10px);
  }
  .login-story__features article > span {
    display: grid;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: var(--motor-radius-sm);
    background: rgb(255 255 255 / 12%);
  }
  .login-story__features div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }
  .login-story__features strong {
    font-size: var(--motor-font-size-12);
  }
  .login-story__features small {
    margin-top: 4px;
    color: rgb(255 255 255 / 58%);
    font-size: var(--motor-font-size-10);
    line-height: 1.45;
  }
  .login-story__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(2px);
  }
  .login-story__orb--one {
    right: -140px;
    bottom: -170px;
    width: 430px;
    height: 430px;
    border: 70px solid rgb(255 255 255 / 7%);
  }
  .login-story__orb--two {
    top: 16%;
    right: 10%;
    width: 120px;
    height: 120px;
    background: rgb(99 160 255 / 18%);
    filter: blur(25px);
  }
  .login-panel {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 100%;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    background:
      radial-gradient(
        circle at 82% 14%,
        color-mix(in srgb, var(--motor-primary) 8%, transparent),
        transparent 28%
      ),
      var(--motor-surface);
  }
  .login-panel__tools {
    position: absolute;
    z-index: 2;
    top: 20px;
    right: 24px;
    display: flex;
    height: 40px;
    align-items: center;
    padding: 4px;
    border-radius: 999px;
    background: var(--motor-surface-soft);
  }
  .login-panel__form {
    display: flex;
    width: 100%;
    min-width: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 72px 32px 32px;
  }
  .login-panel :deep(.login-panel__footer) {
    width: 100%;
    min-height: 64px;
    min-width: 0;
    flex: 0 0 auto;
    align-items: center;
    flex-wrap: wrap;
    margin: 0;
    padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--motor-border);
    background: var(--motor-surface-soft);
  }
  .login-page--form-left {
    grid-template-columns: minmax(520px, 1.1fr) minmax(420px, 0.9fr);

    .login-story {
      order: 2;
    }
    .login-panel {
      order: 1;
    }
  }
  .login-page--form-center {
    display: block;
    position: relative;
    background: var(--motor-app-bg);

    .login-story {
      position: absolute;
      inset: 0;
      min-height: auto;
      padding: 30px clamp(28px, 4vw, 64px);
    }
    .login-story__content {
      display: none;
    }
    .login-story__features {
      display: none;
    }
    .login-panel {
      min-height: 100%;
      background: transparent;
    }
    .login-panel__form {
      padding-bottom: 96px;
    }
    .login-panel__form :deep(.form-box) {
      max-width: 484px;
      padding: 32px;
      border-radius: var(--motor-radius-lg);
      background: var(--motor-surface);
      box-shadow: var(--motor-shadow-md);
    }
    .login-panel :deep(.login-panel__footer) {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      background: color-mix(in srgb, var(--motor-surface) 92%, transparent);
    }
  }
  @media (1120px < width <= 1360px) {
    .login-story h1 {
      font-size: calc(var(--motor-base-font-size) * 30 / 14);
    }
  }
  @media (width <= 1120px) {
    .login-page {
      display: block;
      overflow: auto;
      background: var(--motor-app-bg);
    }
    .login-page--form-left,
    .login-page--form-center {
      .login-story {
        position: relative;
        inset: auto;
        order: initial;
        padding: 24px;
        opacity: 1;
      }
      .login-panel {
        position: relative;
        min-height: calc(100dvh - 176px);
        background: var(--motor-surface);
        order: initial;
      }
      .login-panel__form {
        padding-bottom: 24px;
      }
      .login-panel :deep(.login-panel__footer) {
        position: relative;
        background: var(--motor-surface);
      }
    }
    .login-story {
      min-height: 176px;
      padding: 24px;
    }
    .login-story__content,
    .login-page--form-center .login-story__content {
      display: flex;
      justify-content: flex-start;
      padding-top: 26px;
    }
    .login-story h1 {
      max-width: 520px;
      margin: 10px 0;
      font-size: var(--motor-font-size-34);
    }
    .login-story p {
      display: none;
    }
    .login-story__features {
      display: none;
    }
    .login-panel {
      min-height: calc(100dvh - 176px);
      background: var(--motor-surface);
    }
    .login-panel__tools {
      top: 12px;
      right: 12px;
    }
    .login-panel__form {
      padding: 32px 16px 24px;
    }
    .login-page--form-center .login-panel__form :deep(.form-box) {
      max-width: 420px;
      padding: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .login-panel :deep(.login-panel__footer) {
      background: var(--motor-surface);
    }
  }
  @media (width <= 520px) {
    .login-story {
      min-height: 152px;
    }
    .login-story h1 {
      font-size: var(--motor-font-size-28);
    }
    .login-panel {
      min-height: calc(100dvh - 152px);
    }
    .login-panel__form {
      padding: 24px 12px 28px;
    }
    .login-panel :deep(.login-panel__footer) {
      padding-right: 16px;
      padding-left: 16px;
    }
  }
  @media (height <= 760px) and (width > 1120px) {
    .login-story {
      padding-top: 22px;
      padding-bottom: 22px;
    }
    .login-story__features {
      margin-top: 22px;
      gap: 8px;
    }
    .login-story__features article {
      padding: 10px 12px;
    }
    .login-panel__form {
      align-items: flex-start;
      padding-top: 58px;
      padding-bottom: 24px;
    }
  }
  @media (height <= 520px) and (width <= 1360px) {
    .login-story {
      min-height: 96px;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      gap: 20px;
      padding: 16px 24px;
    }
    .login-story__content {
      display: block;
      flex: 1;
      padding: 0;
    }
    .login-story__eyebrow {
      display: none;
    }
    .login-story h1 {
      max-width: none;
      margin: 0;
      font-size: var(--motor-font-size-24);
      line-height: 1.25;
    }
    .login-panel {
      min-height: calc(100dvh - 96px);
    }
    .login-panel__form {
      padding-top: 44px;
    }
  }
</style>
