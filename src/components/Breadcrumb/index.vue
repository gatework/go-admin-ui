<template>
  <a-breadcrumb v-if="!preferences.breadcrumbHideOnlyOne || visibleLevels.length > 1" class="app-breadcrumb" :class="{ 'breadcrumb-background': preferences.breadcrumbStyle === 'background' }" separator="/">
    <a-breadcrumb-item v-for="(item,index) in visibleLevels" :key="item.path">
      <MenuIcon v-if="preferences.breadcrumbShowIcon && item.meta?.icon" :name="item.meta.icon" />
      <span v-if="item.redirect==='noRedirect'||index==visibleLevels.length-1" class="no-redirect">{{ routeTitle(item) }}</span>
      <a v-else :href="$router.resolve(item.redirect || pathCompile(item.path)).href" @click.prevent="handleLink(item)">{{ routeTitle(item) }}</a>
    </a-breadcrumb-item>
  </a-breadcrumb>
</template>

<script>
import MenuIcon from '@/components/MenuIcon/index.vue'
import { usePreferencesStore } from '@/stores/preferences'
import { compile } from 'path-to-regexp'
import { routeTitle } from '@/lang/backend'

export default {
  components: { MenuIcon },
  setup() { return { preferences: usePreferencesStore() } },
  data() {
    return {
      levelList: null
    }
  },
  computed: { visibleLevels() { return (this.levelList || []).filter(item => this.preferences.breadcrumbShowHome || !['/index', '/dashboard'].includes(item.path)) } },
  watch: {
    $route(route) {
      // if you go to the redirect page, do not update the breadcrumbs
      if (route.path.startsWith('/redirect/')) {
        return
      }
      this.getBreadcrumb()
    }
  },
  created() {
    this.getBreadcrumb()
  },
  methods: {
    // The breadcrumb reads $route.matched, which is vue-router's own matcher
    // state -- not the Pinia menu tree. Anything that translated by rewriting
    // the store would change the sidebar and leave the breadcrumb in the old
    // language, which is the kind of half-applied switch nobody notices in
    // review. Translating at render time cannot go out of step.
    routeTitle,
    getBreadcrumb() {
      // only show routes with meta.title
      let matched = this.$route.matched.filter(item => item.meta && item.meta.title)
      const first = matched[0]

      if (!this.isDashboard(first)) {
        matched = [{ path: '/index', meta: { title: '首页', titleKey: 'route.dashboard' }}].concat(matched)
      }

      this.levelList = matched.filter(item => item.meta && item.meta.title && item.meta.breadcrumb !== false)
    },
    // The dashboard route is named 'Dashboard' (see router/index.js). This used
    // to compare the name with the Chinese title, which never matched, so the
    // dashboard got a second "Home" crumb in front of itself.
    isDashboard(route) {
      return !!route && (route.name === 'Dashboard' || route.path === '/dashboard')
    },
    pathCompile(path) {
      // To solve this problem https://github.com/PanJiaChen/vue-element-admin/issues/561
      const { params } = this.$route
      var toPath = compile(path)
      return toPath(params)
    },
    handleLink(item) {
      const { redirect, path } = item
      if (redirect) {
        this.$router.push(redirect)
        return
      }
      this.$router.push(this.pathCompile(path))
    }
  }
}
</script>

<style lang="scss" scoped>
.app-breadcrumb {
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 14px;
  line-height: 1.4;
  margin-left: 8px;

  .no-redirect {
    color: var(--ga-text-2);
    cursor: text;
  }

  :deep(.arco-breadcrumb-item) {
    float: none;
    flex-shrink: 0;
  }

  :deep(.arco-breadcrumb-item:last-child) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 991px) {
  .app-breadcrumb :deep(.arco-breadcrumb-item:not(:last-child)),
  .app-breadcrumb :deep(.arco-breadcrumb-item-separator) { display: none; }
}
</style>

<style scoped>
.breadcrumb-background :deep(.arco-breadcrumb-item) { background: var(--motor-surface-hover); padding: 4px 8px; border-radius: var(--motor-radius-xs); }
</style>
