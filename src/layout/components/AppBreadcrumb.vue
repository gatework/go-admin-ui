<template>
  <a-breadcrumb id="breadcrumb-container" class="app-breadcrumb" :aria-label="$t('layout.breadcrumb')">
    <a-breadcrumb-item v-for="(item, index) in levels" :key="item.path">
      <span v-if="index === levels.length - 1 || !item.to" class="app-breadcrumb__current">{{ routeTitle(item) }}</span>
      <router-link v-else :to="item.to">{{ routeTitle(item) }}</router-link>
    </a-breadcrumb-item>
  </a-breadcrumb>
</template>

<script setup lang="ts">
/**
 * Where the current page sits in the menu.
 *
 * Reads route.matched -- vue-router's own state, not the Pinia menu tree -- and
 * translates at render time through routeTitle, so the trail follows a language
 * switch together with the sidebar instead of one of them lagging behind.
 */
import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { routeTitle } from '@/lang/backend'

defineOptions({ name: 'AppBreadcrumb' })

interface Level {
  path: string
  name?: unknown
  meta?: { title?: unknown, titleKey?: unknown }
  /** Where the crumb links to; absent for a directory with nothing to open. */
  to?: RouteLocationRaw
}

const HOME: Level = { path: '/dashboard', name: 'Dashboard', meta: { titleKey: 'route.dashboard' }, to: '/dashboard' }
const route = useRoute()

const levels = computed<Level[]>(() => {
  const matched = route.matched
    .filter(record => record.meta?.title && record.meta.breadcrumb !== false)
    .map<Level>(record => ({
      path: record.path,
      name: record.name,
      meta: record.meta,
      // A menu directory redirects to its first child; `noRedirect` marks one that should not be a link.
      to: typeof record.redirect === 'string' && record.redirect !== 'noRedirect' ? record.redirect : undefined
    }))
  return matched[0]?.name === 'Dashboard' ? matched : [HOME, ...matched]
})
</script>

<style lang="scss" scoped>
.app-breadcrumb {
  display: flex;
  min-width: 0;
  align-items: center;
  font-size: var(--motor-font-size-14);

  :deep(.arco-breadcrumb-item) { flex-shrink: 0; color: var(--motor-text-3); }
  :deep(.arco-breadcrumb-item a) { color: inherit; }
  :deep(.arco-breadcrumb-item a:hover) { color: var(--motor-primary); background: transparent; }

  :deep(.arco-breadcrumb-item:last-child) {
    min-width: 0;
    flex-shrink: 1;
    overflow: hidden;
    color: var(--motor-text-1);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// A phone has room for the page's own name only.
@media (max-width: 991px) {
  .app-breadcrumb :deep(.arco-breadcrumb-item:not(:last-child)),
  .app-breadcrumb :deep(.arco-breadcrumb-item-separator) { display: none; }
}
</style>
