<template>
  <div class="setting-switch" :class="{ 'is-disabled': disabled }">
    <span class="setting-switch__icon">
      <slot name="icon"><component :is="icon || IconSettings" /></slot>
    </span>
    <span class="setting-switch__copy">
      <strong>{{ title }}</strong>
      <small v-if="description">{{ description }}</small>
    </span>
    <span
      v-if="reserveShortcut || shortcut"
      class="setting-switch__shortcut-slot"
      aria-hidden="true"
    >
      <kbd v-if="shortcut" class="setting-switch__shortcut">{{ shortcut }}</kbd>
    </span>
    <button
      type="button"
      role="switch"
      :aria-label="title"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="setting-switch__control"
      :class="{ 'is-active': modelValue }"
      @click="$emit('change', !modelValue)"
    >
      <i />
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import { IconSettings } from '@arco-design/web-vue/es/icon'

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    modelValue: boolean;
    shortcut?: string;
    reserveShortcut?: boolean;
    disabled?: boolean;
    icon?: Component;
  }>(),
  {
    description: '',
    shortcut: '',
    reserveShortcut: false,
    disabled: false,
    icon: undefined
  }
)
defineEmits<{ change: [value: boolean] }>()
</script>
