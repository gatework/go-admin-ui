<template>
  <HeaderIconButton v-if="enabled" class="screenfull-button" :aria-label="$t(isFullscreen ? 'layout.exitFullscreen' : 'layout.enterFullscreen')" :aria-pressed="isFullscreen" @click="click">
    <icon-fullscreen-exit v-if="isFullscreen" /><icon-fullscreen v-else />
  </HeaderIconButton>
</template>

<script>
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import screenfull from 'screenfull'

export default {
  name: 'AppScreenfull',
  components: { HeaderIconButton },
  data() {
    return {
      isFullscreen: false
    }
  },
  computed: {
    enabled() { return screenfull.isEnabled }
  },
  mounted() {
    this.init()
  },
  beforeUnmount() {
    this.destroy()
  },
  methods: {
    click() {
      if (screenfull.isEnabled) screenfull.toggle().catch(() => { this.change() })
    },
    change() {
      this.isFullscreen = screenfull.isFullscreen
    },
    init() {
      if (screenfull.isEnabled) {
        screenfull.on('change', this.change)
      }
    },
    destroy() {
      if (screenfull.isEnabled) {
        screenfull.off('change', this.change)
      }
    }
  }
}
</script>
