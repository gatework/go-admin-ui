<template>
  <Transition name="lock-screen-fade">
    <div
      v-if="lockStore.locked"
      class="lock-screen"
      role="dialog"
      aria-modal="true"
      :aria-label="t('settings.lock.title')"
    >
      <div class="lock-screen__orb lock-screen__orb--one" />
      <div class="lock-screen__orb lock-screen__orb--two" />

      <header class="lock-screen__header">
        <Brand />
        <div class="lock-screen__status">
          <span />{{ t('settings.lock.local') }}
        </div>
      </header>

      <div class="lock-screen__main">
        <section class="lock-card">
          <div class="lock-card__time">{{ currentTime }}</div>
          <div class="lock-card__date">{{ currentDate }}</div>
          <div class="lock-card__avatar">
            {{ avatarText }}
            <span><icon-lock /></span>
          </div>
          <h1>{{ userStore.name || userStore.name || APP_META.name }}</h1>
          <p>{{ t('settings.lock.screen.description') }}</p>

          <form class="lock-card__form" @submit.prevent="unlock">
            <a-input-password
              ref="passwordInput"
              v-model="password"
              size="large"
              :placeholder="t('settings.lock.password.placeholder')"
              :disabled="unlocking"
              autocomplete="off"
              :aria-label="t('settings.lock.password.placeholder')"
              allow-clear
              @input="error = ''"
            >
              <template #prefix><icon-safe /></template>
            </a-input-password>
            <div v-if="error" class="lock-card__error" role="alert">
              <icon-exclamation-circle />{{ error }}
            </div>
            <a-button
              html-type="submit"
              type="primary"
              size="large"
              long
              :loading="unlocking"
              :disabled="!password"
            >
              <template #icon><icon-unlock /></template>
              {{ t('settings.lock.unlock') }}
            </a-button>
          </form>

          <button
            type="button"
            class="lock-card__logout"
            @click="confirmLogout"
          >
            {{ t('settings.lock.forgot') }}
          </button>
        </section>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { confirmAction } from '@/utils/modal'
import { useI18n } from 'vue-i18n'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import { useLockScreenStore } from '@/stores/lock-screen'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import Brand from '@/components/brand/index.vue'
import { APP_META } from '@/config/app-meta'

const { t, locale } = useI18n()
const lockStore = useLockScreenStore()
const appStore = useAppStore()
const userStore = useUserStore()
const router = useRouter()
const logout = async() => { await userStore.LogOut(); lockStore.clear(); await router.replace('/login') }
const password = ref('')
const error = ref('')
const unlocking = ref(false)
const now = ref(new Date())
const passwordInput = ref<{ focus: () => void }>()
let timer: number | undefined

const currentTime = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: appStore.timeZone
  }).format(now.value)
)
const currentDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: appStore.timeZone
  }).format(now.value)
)
const avatarText = computed(() =>
  (userStore.name || userStore.name || APP_META.shortName)
    .trim()
    .slice(0, 1)
    .toUpperCase()
)

const focusPassword = () => nextTick(() => passwordInput.value?.focus())
const stopClock = () => window.clearTimeout(timer)
const scheduleClock = () => {
  stopClock()
  if (!lockStore.locked) return

  now.value = new Date()
  timer = window.setTimeout(scheduleClock, 1_020 - (Date.now() % 1_000))
}
const syncVisibleClock = () => {
  if (document.visibilityState === 'visible' && lockStore.locked) {
    scheduleClock()
  }
}
const unlock = async() => {
  if (!password.value || unlocking.value) return
  unlocking.value = true
  try {
    if (!(await lockStore.unlock(password.value))) {
      error.value = t('settings.lock.password.incorrect')
      password.value = ''
      focusPassword()
      return
    }
    password.value = ''
    error.value = ''
  } catch {
    error.value = t('settings.lock.crypto.unavailable')
  } finally {
    unlocking.value = false
  }
}

const confirmLogout = async() => {
  try { await confirmAction({ popupContainer: '.lock-screen', title: t('settings.lock.logout.title'), content: t('settings.lock.logout.description'), okText: t('settings.lock.logout.action') }); await logout() } catch { /* Cancel or an already reported API error. */ }
}

watch(
  () => lockStore.locked,
  (locked) => {
    if (!locked) {
      stopClock()
      return
    }
    scheduleClock()
    password.value = ''
    error.value = ''
    focusPassword()
  },
  { immediate: true }
)
onMounted(() => {
  document.addEventListener('visibilitychange', syncVisibleClock)
  window.addEventListener('focus', syncVisibleClock)
})
onBeforeUnmount(() => {
  stopClock()
  document.removeEventListener('visibilitychange', syncVisibleClock)
  window.removeEventListener('focus', syncVisibleClock)
})
</script>

<style scoped lang="scss">
  .lock-screen {
    position: fixed;
    z-index: 4000;
    inset: 0;
    display: grid;
    overflow: hidden;
    grid-template-rows: 72px minmax(0, 1fr);
    background:
      radial-gradient(
        circle at 48% 45%,
        rgb(var(--arcoblue-6) / 9%),
        transparent 34%
      ),
      var(--motor-app-bg);
    color: var(--motor-text-1);

    &__header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 clamp(20px, 4vw, 56px);
    }

    &__status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--motor-text-3);
      font-size: var(--motor-font-size-12);

      span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: rgb(var(--green-6));
        box-shadow: 0 0 0 4px rgb(var(--green-6) / 12%);
      }
    }

    &__main {
      position: relative;
      z-index: 1;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    &__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(1px);
      opacity: 0.75;

      &--one {
        top: -18vw;
        right: -12vw;
        width: 38vw;
        height: 38vw;
        background: rgb(var(--arcoblue-6) / 8%);
      }

      &--two {
        bottom: -22vw;
        left: -14vw;
        width: 44vw;
        height: 44vw;
        background: rgb(var(--arcoblue-4) / 7%);
      }
    }
  }

  .lock-card {
    width: min(400px, 100%);
    padding: 36px;
    border: 1px solid var(--motor-border);
    border-radius: var(--motor-radius-xl);
    background: color-mix(in srgb, var(--motor-surface) 90%, transparent);
    box-shadow: 0 30px 80px rgb(15 23 42 / 13%);
    backdrop-filter: blur(24px);
    text-align: center;

    &__time {
      font-size: clamp(
        var(--motor-font-size-42),
        7vw,
        var(--motor-font-size-64)
      );
      font-weight: 250;
      letter-spacing: -0.055em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    &__date {
      margin-top: 8px;
      color: var(--motor-text-3);
      font-size: var(--motor-font-size-13);
    }

    &__avatar {
      position: relative;
      display: grid;
      width: 72px;
      height: 72px;
      margin: 28px auto 16px;
      place-items: center;
      border: 5px solid var(--motor-surface);
      border-radius: var(--motor-radius-lg);
      background: var(--motor-avatar-background);
      box-shadow: 0 12px 30px var(--motor-primary-shadow);
      color: #fff;
      font-size: var(--motor-font-size-28);
      font-weight: 760;

      span {
        position: absolute;
        right: -7px;
        bottom: -7px;
        display: grid;
        width: 27px;
        height: 27px;
        place-items: center;
        border: 3px solid var(--motor-surface);
        border-radius: var(--motor-radius-sm);
        background: var(--motor-text-1);
        color: var(--motor-surface);
        font-size: var(--motor-font-size-12);
      }
    }

    h1 {
      margin: 0;
      font-size: var(--motor-font-size-20);
      font-weight: 720;
    }

    > p {
      margin: 7px 0 22px;
      color: var(--motor-text-3);
      font-size: var(--motor-font-size-13);
    }

    &__form {
      display: grid;
      gap: 12px;
    }

    &__error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgb(var(--red-6));
      font-size: var(--motor-font-size-12);
      text-align: left;
    }

    &__logout {
      margin-top: 18px;
      border: 0;
      background: transparent;
      color: var(--motor-text-3);
      cursor: pointer;
      font-size: var(--motor-font-size-12);

      &:hover {
        color: var(--motor-primary);
      }
    }
  }

  .lock-screen-fade-enter-active,
  .lock-screen-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .lock-screen-fade-enter-from,
  .lock-screen-fade-leave-to {
    opacity: 0;
  }

  @media (width <= 575px) {
    .lock-screen {
      grid-template-rows: 60px minmax(0, 1fr);

      &__status {
        display: none;
      }

      &__main {
        padding: 12px;
      }
    }

    .lock-card {
      padding: 28px 22px;
      border-radius: var(--motor-radius-xl);
    }
  }
</style>
