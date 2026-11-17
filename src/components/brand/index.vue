<template>
  <div class="brand" :class="{ 'brand--compact': compact }">
    <img v-if="logo && !logoFailed" class="brand__logo" :src="logo" alt="" @error="logoFailed = true">
    <span v-else class="brand__mark" aria-hidden="true">{{ mark }}</span>
    <span v-if="!compact" class="brand__name">{{ name }}</span>
  </div>
</template>

<script lang="ts" setup>
/**
 * The product mark and name.
 *
 * Defaults to motor's own. A deployment that configured an application name or
 * logo passes them in; the mark is then the name's first letter, so a collapsed
 * rail still shows something that belongs to that name.
 */
import { computed, ref, watch } from 'vue'
import { APP_META } from '@/config/app-meta'

const props = withDefaults(defineProps<{
  compact?: boolean
  name?: string
  logo?: string
}>(), { compact: false, name: APP_META.name, logo: '' })

const logoFailed = ref(false)
watch(() => props.logo, () => { logoFailed.value = false })
const mark = computed(() => props.name === APP_META.name ? APP_META.shortName : props.name.trim().charAt(0).toUpperCase())
</script>

<style lang="scss" scoped>
.brand {
  --brand-mark-size: 34px;

  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;

  &__mark,
  &__logo {
    width: var(--brand-mark-size);
    height: var(--brand-mark-size);
    flex: 0 0 auto;
    border-radius: calc(var(--brand-mark-size) * 0.28);
  }

  &__mark {
    display: grid;
    place-items: center;
    background: var(--motor-primary-gradient);
    box-shadow: 0 4px 12px var(--motor-primary-shadow);
    color: #fff;
    font-size: calc(var(--brand-mark-size) * 0.5);
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  &__logo { object-fit: cover; }

  &__name {
    overflow: hidden;
    color: var(--motor-text-1);
    font-size: var(--motor-font-size-16);
    font-weight: 700;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &--compact { justify-content: center; }
}
</style>
