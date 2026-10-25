<template>
  <button type="button" class="settings-trigger" :title="title || $t('components.rightPanel.title')" :aria-label="title || $t('components.rightPanel.title')" aria-haspopup="dialog" @click="$emit('click')">
    <i class="ri-settings-3-line" aria-hidden="true" />
  </button>
</template>

<script>
/**
 * Opens the layout settings drawer.
 *
 * A single-purpose component so it mounts in the navbar icon row alongside
 * Hamburger and Screenfull rather than as inline markup.
 *
 * A real <button> rather than a div with role="button": that gives keyboard
 * activation on both Enter and Space for free, where the div form needs an
 * explicit tabindex plus a keyup handler duplicating the click one.
 */
export default {
  name: 'AppSettingsTrigger',
  props: {
    /**
     * Overrides the label. Left empty it falls back to the drawer's own
     * heading, which is where the default belongs -- a translated default
     * cannot live here, since props are read once at definition time and would
     * freeze the language the module was imported in.
     */
    title: {
      type: String,
      default: ''
    }
  },
  emits: ['click']
}
</script>

<style lang="scss" scoped>
.settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--ga-brand);
    outline-offset: 2px;
    border-radius: var(--ga-radius-sm);
  }
}
</style>
