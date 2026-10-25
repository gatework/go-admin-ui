<template>
  <div class="brand" :class="{ 'brand--compact': compact }">
    <span class="brand__mark" aria-hidden="true">{{ APP_META.shortName }}</span>
    <span v-if="!compact" class="brand__name">{{ APP_META.name }}</span>
  </div>
</template>

<script lang="ts" setup>
import { APP_META } from '@/config/app-meta'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<style lang="scss" scoped>
  .brand {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;

    &__mark {
      display: grid;
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: var(--motor-radius-md);
      background: var(--motor-avatar-background);
      box-shadow: var(--motor-avatar-shadow);
      color: #fff;
      font-size: var(--motor-font-size-17);
      font-weight: 800;
      letter-spacing: -0.04em;
    }

    &__name {
      overflow: hidden;
      color: var(--motor-text-1);
      font-size: var(--motor-font-size-16);
      font-weight: 700;
      letter-spacing: -0.02em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &--compact {
      justify-content: center;
    }
  }
</style>
