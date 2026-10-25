<template>
  <a-tooltip
    :content="tooltip"
    :disabled="!tooltip"
    position="bottom"
    content-class="header-action-tooltip"
    arrow-class="header-action-tooltip__arrow"
  >
    <button
      v-bind="$attrs"
      type="button"
      class="header-action"
      :class="[
        `header-action--${motion}`,
        {
          'header-action--overflow-visible': allowOverflow,
          'is-active': active,
          'is-triggered': triggered,
        },
      ]"
      :aria-label="ariaLabel || tooltip"
      :aria-pressed="active || undefined"
      :disabled="disabled"
      @click="handleClick"
    >
      <span class="header-action__halo" />
      <span class="header-action__icon"><slot /></span>
      <i v-if="active" class="header-action__indicator" />
    </button>
  </a-tooltip>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue'
defineOptions({ name: 'HeaderIconButton', inheritAttrs: false })

withDefaults(
  defineProps<{
    tooltip?: string;
    ariaLabel?: string;
    active?: boolean;
    disabled?: boolean;
    allowOverflow?: boolean;
    motion?: 'lift' | 'spin' | 'pulse';
  }>(),
  {
    tooltip: '',
    ariaLabel: '',
    active: false,
    disabled: false,
    allowOverflow: false,
    motion: 'lift'
  }
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const triggered = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const handleClick = (event: MouseEvent) => {
  triggered.value = false
  if (event.detail > 0) {
    requestAnimationFrame(() => {
      triggered.value = true
      clearTimeout(timer)
      timer = setTimeout(() => {
        triggered.value = false
      }, 380)
    })
  }
  emit('click', event)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped lang="scss">
  .header-action {
    position: relative;
    display: grid;
    width: 32px;
    height: 32px;
    overflow: hidden;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: var(--motor-radius-sm);
    background: transparent;
    color: var(--motor-text-2);
    cursor: pointer;
    isolation: isolate;
    transition:
      color 0.18s ease,
      background-color 0.18s ease,
      box-shadow 0.18s ease,
      transform 0.16s ease;

    &__halo {
      position: absolute;
      z-index: -1;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--motor-primary);
      opacity: 0;
      transform: scale(0.6);
      transition:
        transform 0.28s ease,
        opacity 0.28s ease;
    }

    &__icon {
      display: grid;
      width: 18px;
      height: 18px;
      place-items: center;
      font-size: 18px;
      line-height: 1;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);

      :deep(svg) {
        display: block;
        width: 1em;
        height: 1em;
        flex: 0 0 auto;
      }
    }

    &__indicator {
      position: absolute;
      right: 4px;
      bottom: 3px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--motor-primary);
      box-shadow: 0 0 0 2px var(--motor-surface);
    }

    &--overflow-visible {
      overflow: visible;
    }

    @media (hover: hover) {
      &:hover:not(:disabled) {
        background: var(--motor-surface-hover);
        color: var(--motor-text-1);
      }

      &:hover:not(:disabled) .header-action__icon {
        transform: scale(1.04);
      }
    }

    &.is-active {
      background: var(--motor-primary-soft);
      color: var(--motor-primary);
    }

    &:active:not(:disabled) {
      transform: scale(0.94);
    }

    &.is-triggered .header-action__halo {
      opacity: 0.08;
      transform: scale(5);
    }

    &--spin.is-triggered .header-action__icon {
      animation: header-action-spin 0.38s ease;
    }

    &--pulse.is-triggered .header-action__icon {
      animation: header-action-pulse 0.38s ease;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  @keyframes header-action-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes header-action-pulse {
    50% {
      transform: scale(0.78);
    }
  }
</style>
