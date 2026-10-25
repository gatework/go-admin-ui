<template>
  <a-select
    class="arco-icon-select"
    :model-value="modelValue"
    :placeholder="$t('components.iconSelect.placeholder')"
    :aria-label="$t('admin.sysMenu.menuIcon')"
    allow-search
    allow-clear
    :options="menuIconNames.map(name => ({ value: name, label: name }))"
    :virtual-list-props="{ height: 240 }"
    @change="select"
  >
    <template #prefix><MenuIcon v-if="modelValue" :name="modelValue" /><icon-search v-else /></template>
    <template #option="{ data }"><span class="icon-option" role="option" :aria-label="data.label" :aria-selected="modelValue === data.value"><MenuIcon :name="data.value" /><span>{{ data.label }}</span></span></template>
  </a-select>
</template>
<script setup lang="ts">
import { menuIconNames } from '@/utils/menu-icons'
import MenuIcon from '@/components/MenuIcon/index.vue'
defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string], selected: [value: string] }>()
const select = (value: unknown) => { const name = typeof value === 'string' ? value : ''; emit('update:modelValue', name); emit('selected', name) }
</script>
<style scoped>
.arco-icon-select { width: 100%; }
.icon-option { display: flex; align-items: center; gap: 12px; min-height: 30px; }
</style>
