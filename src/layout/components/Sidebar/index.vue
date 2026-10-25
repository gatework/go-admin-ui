<template>
  <div :class="{'has-logo':showLogo}">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <div class="sidebar-scroll">
      <a-menu :selected-keys="[activeMenu]" :collapsed="isCollapse" :collapsed-width="54" :theme="themeStyle" accordion auto-open-selected>
        <sidebar-item v-for="route in sidebarRouters" :key="route.path" :item="route" :base-path="route.path" />
      </a-menu>
    </div>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import Logo from './Logo'
import SidebarItem from './SidebarItem'
import variables from '@/styles/variables.module.scss'

export default {
  components: { SidebarItem, Logo },
  computed: {
    ...mapState(usePermissionStore, ['sidebarRouters']),
    ...mapState(useAppStore, ['sidebar']),
    activeMenu() {
      const route = this.$route
      const { meta, path } = route
      // if set path, the sidebar will highlight the path you set
      if (meta.activeMenu) {
        return meta.activeMenu
      }
      return path
    },
    ...mapState(useSettingsStore, ['theme', 'themeStyle']),
    ...mapState(useSettingsStore, { showLogo: 'sidebarLogo' }),
    variables() {
      return variables
    },
    isCollapse() {
      return !this.sidebar.opened
    }
  },
  mounted() {

  },
  methods: {

  }
}
</script>
