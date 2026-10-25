<template>
  <div
    class="watermark-layer"
    :class="{ 'watermark-layer--preview': preview }"
    :style="{ '--watermark-opacity': String(appStore.watermarkOpacity) }"
    aria-hidden="true"
  >
    <div v-for="index in tileCount" :key="index" class="watermark-tile">
      <span v-for="line in lines" :key="line">{{ line }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import { useUserStore } from '@/stores/user'
import { APP_META } from '@/config/app-meta'

const props = withDefaults(defineProps<{ preview?: boolean }>(), {
  preview: false
})
const appStore = useAppStore()
const userStore = useUserStore()
const { locale } = useI18n()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined

const lines = computed(() => {
  const content = appStore.watermarkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
  if (appStore.watermarkIncludeUser) {
    const identity = [userStore.name]
      .filter(Boolean)
      .join(' · ')
    if (identity) content.push(identity)
  }
  if (appStore.watermarkIncludeTime) {
    content.push(
      new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: appStore.timeZone
      }).format(now.value)
    )
  }
  return content.length ? content : [APP_META.name]
})
const tileCount = computed(() => (props.preview ? 6 : 54))

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 30_000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped lang="scss">
  .watermark-layer {
    position: absolute;
    z-index: 60;
    inset: 0;
    display: grid;
    overflow: hidden;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    grid-auto-rows: 150px;
    pointer-events: none;
    user-select: none;
  }

  .watermark-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 12px;
    color: var(--motor-text-2);
    font-size: var(--motor-font-size-13);
    font-weight: 600;
    line-height: 1.55;
    opacity: var(--watermark-opacity);
    text-align: center;
    transform: rotate(-22deg);
  }

  .watermark-layer--preview {
    position: relative;
    width: 100%;
    height: 136px;
    border: 1px solid var(--motor-border);
    border-radius: var(--motor-radius-md);
    background:
      linear-gradient(135deg, var(--motor-surface-soft), transparent),
      var(--motor-surface);
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: 68px;
  }

  .watermark-layer--preview .watermark-tile {
    min-width: 0;
    padding: 4px;
    font-size: var(--motor-font-size-9);
  }
</style>
