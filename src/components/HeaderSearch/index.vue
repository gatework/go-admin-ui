<template>
  <div :class="{'show':show}" class="header-search" @click.stop @keydown.esc.capture.stop.prevent="closeAndFocus">
    <HeaderIconButton ref="searchTrigger" class="search-trigger" :aria-label="$t('common.search')" :aria-expanded="show" @click.stop="click">
      <icon-search class="search-icon" />
    </HeaderIconButton>
    <a-select
      v-if="show"
      ref="headerSearchSelect"
      v-model="search"
      :filter-option="false"
      allow-search
      :placeholder="$t('common.search')"
      :aria-label="$t('common.search')"
      class="header-search-select"
      @search="querySearch"
      @change="change"
    >
      <a-option v-for="item in options" :key="item.path" :value="item.path" :label="item.title.join(' > ')" />
    </a-select>
  </div>
</template>

<script>
// fuse is a lightweight fuzzy-search module
// make search results more in line with expectations
import { mapState } from 'pinia'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import { usePermissionStore } from '@/stores/permission'
import Fuse from 'fuse.js'
import path from 'path'
import { routeTitle } from '@/lang/backend'

export default {
  name: 'HeaderSearch',
  components: { HeaderIconButton },
  data() {
    return {
      search: '',
      options: [],
      searchPool: [],
      show: false,
      fuse: undefined
    }
  },
  computed: {
    ...mapState(usePermissionStore, { routes: 'routes' })
  },
  watch: {
    routes() {
      this.searchPool = this.generateRoutes(this.routes)
    },
    /**
     * The index stores titles, so it has to be rebuilt when they change.
     *
     * Everything else that renders a menu title translates as it renders and is
     * reactive for free. This one cannot: fuse.js indexes plain strings up
     * front, and the menu tree itself never changes on a language switch -- the
     * `routes` watcher above would not fire.
     */
    '$i18n.locale'() {
      this.close()
      this.searchPool = this.generateRoutes(this.routes)
    },
    searchPool(list) {
      this.initFuse(list)
    },
    show(value) {
      if (value) {
        document.body.addEventListener('click', this.close)
      } else {
        document.body.removeEventListener('click', this.close)
      }
    }
  },
  mounted() {
    this.searchPool = this.generateRoutes(this.routes)
  },
  beforeUnmount() {
    document.body.removeEventListener('click', this.close)
  },
  methods: {
    click() {
      this.show = !this.show
      if (this.show) {
        this.$nextTick(() => this.$el.querySelector('input')?.focus())
      }
    },
    close() {
      this.$el.querySelector('input')?.blur()
      this.options = []
      this.show = false
    },
    async closeAndFocus() {
      this.close()
      await this.$nextTick()
      this.$refs.searchTrigger.focus()
    },
    change(val) {
      this.$router.push(val)
      this.search = ''
      this.options = []
      this.$nextTick(() => {
        this.show = false
      })
    },
    initFuse(list) {
      this.fuse = new Fuse(list, {
        shouldSort: true,
        threshold: 0.4,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [{
          name: 'title',
          weight: 0.7
        }, {
          name: 'path',
          weight: 0.3
        }]
      })
    },
    // Filter out the routes that can be displayed in the sidebar
    // And generate the internationalized title
    generateRoutes(routes, basePath = '/', prefixTitle = []) {
      let res = []

      for (const router of routes) {
        // skip hidden router
        if (router.hidden) { continue }

        const data = {
          path: path.resolve(basePath, router.path),
          title: [...prefixTitle]
        }

        // meta.title decides whether the route is worth indexing at all; the
        // string that goes IN is the translated one, or English users would be
        // searching a list of Chinese names.
        if (router.meta && router.meta.title) {
          data.title = [...data.title, routeTitle(router)]

          if (router.redirect !== 'noRedirect') {
            // only push the routes with title
            // special case: need to exclude parent router without redirect
            res.push(data)
          }
        }

        // recursive child routes
        if (router.children) {
          const tempRoutes = this.generateRoutes(router.children, data.path, data.title)
          if (tempRoutes.length >= 1) {
            res = [...res, ...tempRoutes]
          }
        }
      }
      return res
    },
    querySearch(query) {
      if (query !== '') {
        // fuse 6 returns [{ item, refIndex, score }] rather than the matched
        // objects themselves, which fuse 3 did. Assigning the wrapper straight
        // through left every option with an undefined `title`, so the template
        // threw on .join() and the dropdown rendered as "no data" -- the search
        // has not returned a usable result since that upgrade.
        this.options = this.fuse.search(query).map(result => result.item)
      } else {
        this.options = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.header-search {
  display: inline-flex;
  align-items: center;

  .header-search-select {
    transition: width 0.2s;
    width: 0;
    overflow: hidden;
    background: transparent;
    border-radius: 0;
    display: inline-block;
    vertical-align: middle;

    :deep(.arco-select-view-input) {
      border-radius: 0;
      border: 0;
      padding-left: 0;
      padding-right: 0;
      box-shadow: none !important;
      border-bottom: 1px solid #d9d9d9;
      vertical-align: middle;
    }
  }

  &.show {
    .header-search-select {
      width: 210px;
      margin-left: 10px;
    }
  }
}
</style>

<style scoped>
@media (max-width: 767px) { .header-search.show { position: absolute; left: 8px; right: 8px; z-index: 1; background: var(--motor-surface); } .header-search-select { width: calc(100vw - 70px) !important; } }
</style>
