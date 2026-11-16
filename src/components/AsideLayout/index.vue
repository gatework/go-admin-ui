<template>
  <div class="aside-layout" :class="[`aside-layout--${compact ? collapse : 'wide'}`]" :style="{ '--aside-width': `${width}px` }">
    <template v-if="!compact">
      <aside class="aside-layout__aside" :aria-label="title">
        <a-card v-if="card" class="aside-layout__card"><slot name="aside" :close="close" :compact="false" /></a-card>
        <slot v-else name="aside" :close="close" :compact="false" />
      </aside>
    </template>
    <div v-else-if="collapse === 'stack'" class="aside-layout__stacked">
      <a-card v-if="card" class="aside-layout__card"><slot name="aside" :close="close" :compact="true" /></a-card>
      <slot v-else name="aside" :close="close" :compact="true" />
    </div>
    <a-button
      v-else-if="collapse === 'drawer'"
      class="aside-layout__trigger"
      long
      :aria-label="current ? `${title} · ${current}` : title"
      :aria-expanded="drawerOpen"
      @click="drawerOpen = true"
    >
      <template #icon><icon-menu-unfold /></template>
      <span class="aside-layout__trigger-text"><span>{{ title }}</span><strong v-if="current">{{ current }}</strong></span>
      <icon-right class="aside-layout__trigger-caret" />
    </a-button>
    <div class="aside-layout__main"><slot /></div>
    <AppDrawer
      v-if="compact && collapse === 'drawer'"
      v-model:visible="drawerOpen"
      class="aside-layout__drawer"
      :title="title"
      :width="phone ? '100%' : 360"
      :footer="false"
    >
      <slot name="aside" :close="close" :compact="true" />
    </AppDrawer>
  </div>
</template>

<script setup lang="ts">
/**
 * A list page with a scope picker beside it: a group tree, a controller list,
 * saved queries.
 *
 * Wide screens get a fixed-width card on the left. Below `breakpoint` the aside
 * either moves into a drawer behind a trigger that names the current scope
 * (`collapse="drawer"`, the default), stacks above the content (`"stack"`, for
 * short asides that are part of the task), or disappears so the page can offer
 * its own compact control (`"none"`).
 *
 * The aside slot receives `close`, so choosing a scope inside the drawer can
 * also dismiss it, and `compact`, for the few asides that render differently.
 */
import { ref } from 'vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import { useNarrowScreen } from '@/composables/useNarrowScreen'

defineOptions({ name: 'AsideLayout' })
const props = withDefaults(defineProps<{
  /** Names the aside, the drawer, and the compact trigger. */
  title: string
  /** The current scope, shown on the compact trigger. */
  current?: string
  width?: number
  /** Viewport width (px) at and below which the aside collapses. */
  breakpoint?: number
  collapse?: 'drawer' | 'stack' | 'none'
  /** Draw the aside as a card. Off when the layout already sits inside one. */
  card?: boolean
}>(), { current: undefined, width: 244, breakpoint: 1023, collapse: 'drawer', card: true })

const compact = useNarrowScreen(props.breakpoint)
const phone = useNarrowScreen()
const drawerOpen = ref(false)
const close = () => { drawerOpen.value = false }
defineExpose({ close })
</script>

<style scoped lang="scss">
.aside-layout--wide {
  display: grid;
  grid-template-columns: var(--aside-width) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.aside-layout__aside,
.aside-layout__main { min-width: 0; }

/* Follows the page as the list scrolls, so changing scope never means scrolling back up. */
.aside-layout__aside { position: sticky; top: 12px; }
.aside-layout__card > :deep(.arco-card-body) { padding: 16px; }

.aside-layout__stacked { margin-bottom: 16px; }

.aside-layout__trigger {
  display: flex;
  align-items: center;
  height: auto;
  min-height: 40px;
  margin-bottom: 12px;
  padding: 8px 12px;
  text-align: left;
  white-space: normal;
}

.aside-layout__trigger-text {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 2px 8px;
  min-width: 0;
  color: var(--color-text-2);
}

.aside-layout__trigger-text strong { color: var(--color-text-1); font-weight: 600; overflow-wrap: anywhere; }
.aside-layout__trigger-caret { flex-shrink: 0; color: var(--color-text-3); }

@media (max-width: 767px) {
  .aside-layout__trigger { min-height: 44px; margin: 0 12px 12px; width: calc(100% - 24px); }
  .aside-layout__stacked { margin-bottom: 12px; }
}
</style>
