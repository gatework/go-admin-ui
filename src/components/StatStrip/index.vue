<template>
  <dl class="stat-strip" :style="{ '--stat-min': `${minWidth}px` }">
    <component
      :is="item.to ? 'router-link' : 'div'"
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      class="stat-strip__item"
      :class="[`is-${item.tone ?? 'plain'}`, { 'is-link': item.to }]"
    >
      <dt>
        <component :is="item.icon" v-if="item.icon" class="stat-strip__icon" />
        {{ item.label }}
      </dt>
      <dd>
        <a-skeleton-line v-if="item.loading" :rows="1" :line-height="22" :widths="[64]" />
        <template v-else>
          <strong>{{ display(item.value) }}</strong>
          <span v-if="item.unit" class="stat-strip__unit">{{ item.unit }}</span>
        </template>
      </dd>
      <p v-if="item.hint" class="stat-strip__hint">{{ item.hint }}</p>
    </component>
  </dl>
</template>

<script setup lang="ts">
/**
 * A row of figures: what there is, and what state it is in.
 *
 * Used above a list to summarise it and on the overview to summarise a module.
 * A figure with `to` is a link to where the number comes from. `tone` colours
 * the figure only when it says something -- a failure count, an offline total.
 */
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { display } from '@/utils/format'

export interface StatItem {
  key: string
  label: string
  /** Missing, null or '' renders as an em dash; 0 is a value. */
  value?: string | number | null
  unit?: string
  /** A second line: a timestamp, a breakdown, why the figure is absent. */
  hint?: string
  tone?: 'ok' | 'warn' | 'danger' | 'info' | 'idle'
  icon?: Component
  to?: RouteLocationRaw
  loading?: boolean
}

defineOptions({ name: 'StatStrip' })
withDefaults(defineProps<{
  items: StatItem[]
  /** Narrowest a figure may get before the row wraps, in px. */
  minWidth?: number
}>(), { minWidth: 168 })
</script>

<style lang="scss" scoped>
.stat-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--stat-min), 1fr));
  gap: var(--motor-space-3);
  margin: 0;

  &__item {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border: 1px solid var(--motor-border-soft);
    border-radius: var(--motor-radius-sm);
    background: var(--motor-surface);
    color: inherit;
    transition: border-color var(--motor-duration), box-shadow var(--motor-duration);

    &.is-link:hover { border-color: var(--motor-primary); box-shadow: var(--motor-shadow-sm); }
  }

  dt {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--motor-text-2);
    font-size: var(--motor-font-size-13);
  }

  &__icon { flex-shrink: 0; color: var(--motor-text-3); font-size: var(--motor-font-size-16); }

  dd {
    display: flex;
    min-height: 32px;
    align-items: baseline;
    gap: 6px;
    margin: 0;
    font-variant-numeric: tabular-nums;

    strong { overflow: hidden; color: var(--motor-text-1); font-size: var(--motor-font-size-24); font-weight: 600; line-height: 32px; text-overflow: ellipsis; white-space: nowrap; }
  }

  &__unit { color: var(--motor-text-3); font-size: var(--motor-font-size-12); }
  &__hint { margin: 0; overflow: hidden; color: var(--motor-text-3); font-size: var(--motor-font-size-12); line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }

  .is-ok dd strong { color: var(--motor-tone-ok); }
  .is-warn dd strong { color: var(--motor-tone-warn); }
  .is-danger dd strong { color: var(--motor-tone-danger); }
  .is-info dd strong { color: var(--motor-tone-info); }
  .is-idle dd strong { color: var(--motor-tone-idle); }
}
</style>
