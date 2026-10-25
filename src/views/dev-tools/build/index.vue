<template>
  <PageContainer card>
    <a-spin :loading="loading" style="display: block; width: 100%">
      <div ref="container" class="form-builder-frame" :style="{ height: `${height}px` }">
        <iframe ref="frame" :src="src" :title="t('devTools.build.title')" @load="loaded" />
      </div>
    </a-spin>
  </PageContainer>
</template>

<script setup lang="ts">
import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/PageContainer/index.vue'

defineOptions({ name: 'Build' })
const { t, locale } = useI18n()
const frame = ref<HTMLIFrameElement>()
const loading = ref(true)
const container = ref<HTMLElement>()
const height = ref(0)
let active = false
let animationFrame = 0
let resizeObserver: ResizeObserver | undefined
let layoutObserver: MutationObserver | undefined
const measuredElements = new Set<Element>()
// Keep the URL stable: language and theme updates must not discard edits in the iframe.
const src = `${import.meta.env.BASE_URL}form-generator/index.html?locale=${encodeURIComponent(locale.value)}&theme=${document.body.getAttribute('arco-theme') === 'dark' ? 'dark' : 'light'}`
function fitToWindow() {
  animationFrame = 0
  const element = container.value
  if (!active || !element?.isConnected) return
  const shell = element.closest('.main-container')
  const footer = shell?.querySelector<HTMLElement>(':scope > .app-footer')
  const targets = new Set<Element>([element])
  let trailingSpace = 0
  for (let ancestor = element.parentElement; ancestor && ancestor !== shell && ancestor !== document.body; ancestor = ancestor.parentElement) {
    targets.add(ancestor)
    const style = getComputedStyle(ancestor)
    trailingSpace += (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0) + (parseFloat(style.marginBottom) || 0)
  }
  let footerSpace = 0
  if (footer) {
    targets.add(footer)
    const style = getComputedStyle(footer)
    footerSpace = footer.getBoundingClientRect().height + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
  }
  const header = shell?.querySelector(':scope > .shell-header')
  if (header) targets.add(header)
  for (const target of measuredElements) if (!targets.has(target)) { resizeObserver?.unobserve(target); measuredElements.delete(target) }
  for (const target of targets) if (!measuredElements.has(target)) { resizeObserver?.observe(target); measuredElements.add(target) }
  // Reserve actual shell chrome and the card's trailing space, independent of layout mode.
  height.value = Math.max(0, Math.floor(window.innerHeight - element.getBoundingClientRect().top - window.scrollY - trailingSpace - footerSpace))
}
function scheduleFit() {
  if (active && !animationFrame) animationFrame = requestAnimationFrame(fitToWindow)
}
function syncAppearance() {
  const style = getComputedStyle(document.body)
  const primary = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), style.getPropertyValue(`--primary-${index + 1}`).trim()]))
  frame.value?.contentWindow?.postMessage({
    type: 'form-generator:appearance', locale: locale.value,
    dark: document.body.getAttribute('arco-theme') === 'dark', primary
  }, window.location.origin)
}
function loaded() { loading.value = false; syncAppearance(); scheduleFit() }
function onMessage(event: MessageEvent) {
  if (event.origin === location.origin && event.source === frame.value?.contentWindow && event.data?.type === 'form-generator:ready') loaded()
}
watch(locale, () => { if (active) syncAppearance() })
const observer = new MutationObserver(syncAppearance)
function start() {
  if (active) return
  active = true
  window.addEventListener('resize', scheduleFit)
  window.addEventListener('message', onMessage)
  observer.observe(document.body, { attributes: true, attributeFilter: ['arco-theme', 'style'] })
  resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleFit)
  layoutObserver = new MutationObserver(scheduleFit)
  const shell = container.value?.closest('.main-container') ?? container.value?.parentElement
  if (shell) {
    layoutObserver.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
    if (shell.parentElement) layoutObserver.observe(shell.parentElement, { attributes: true, attributeFilter: ['class', 'style'] })
  }
  void nextTick(() => { syncAppearance(); scheduleFit() })
}
function stop() {
  active = false
  window.removeEventListener('resize', scheduleFit)
  window.removeEventListener('message', onMessage)
  observer.disconnect()
  resizeObserver?.disconnect()
  layoutObserver?.disconnect()
  measuredElements.clear()
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
}
onMounted(start)
onActivated(start)
onDeactivated(stop)
onUnmounted(stop)
</script>

<style scoped>
.form-builder-frame { min-height: 0; overflow: hidden; }
iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
