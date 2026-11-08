<template>
  <section><a-alert
    v-if="workspace.failed.value"
    type="warning"
  >{{ t('networkFirewall.loadFailed') }}<template #action><a-button
    @click="load"
  >{{ t('networkFirewall.retry') }}</a-button></template></a-alert><a-spin :loading="workspace.loading.value"><template
    v-if="object"
  >
    <h2>{{ object.name || object.nativeId }}</h2><a-descriptions
      bordered
      :column="1"
    ><a-descriptions-item :label="t('networkFirewall.nativeId')">{{ object.nativeId }}</a-descriptions-item><a-descriptions-item
      :label="t('networkFirewall.scope')"
    >{{ object.scope || '—' }}</a-descriptions-item><a-descriptions-item
      :label="t('networkFirewall.position')"
    >{{ object.position }}</a-descriptions-item><a-descriptions-item
      :label="t('networkFirewall.state')"
    >
      <StateTag :value="object.state" />
    </a-descriptions-item></a-descriptions>
    <section class="fw-section">
      <h3>{{ t('networkFirewall.nativeFields') }}</h3>
      <dl class="fw-definition"><template
        v-for="field in visibleFields(object.record)"
        :key="field.name"
      >
        <dt>{{ te(`networkFirewall.${field.name}`) ? t(`networkFirewall.${field.name}`) : field.name }}</dt>
        <dd>{{ field.value }}</dd>
      </template></dl>
    </section>
    <section
      v-if="object.diagnostics?.length"
      class="fw-section"
    >
      <h3>{{ t('networkFirewall.diagnostics') }}</h3><a-alert
        v-for="(item, index) in object.diagnostics"
        :key="index"
        type="warning"
      >{{ item.message || item.code }} · {{ item.object }}</a-alert>
    </section>
    <section
      v-for="direction in ['outgoing', 'incoming'] as const"
      :key="direction"
      class="fw-section"
    >
      <h3>{{ t(`networkFirewall.${direction}`) }}</h3><a-empty v-if="!references[direction]?.length" />
      <div
        v-for="(reference, index) in references[direction]"
        :key="index"
        class="fw-row"
      ><a-space
        wrap
      ><a-tag>{{ reference.role }}</a-tag><span>{{ t(`networkFirewall.kinds.${direction === 'outgoing' ? reference.targetKind : reference.sourceKind}`) }}
        #{{ direction === 'outgoing' ? reference.targetId : reference.sourceId }}</span><a-button
        v-if="reference.resolved"
        type="text"
        @click="emit('inspect', direction === 'outgoing' ? reference.targetKind : reference.sourceKind, direction === 'outgoing' ? reference.targetId : reference.sourceId)"
      >{{ t('networkFirewall.details') }}</a-button><a-tag
        v-else
        color="orange"
      >{{ t('networkFirewall.unresolved') }}</a-tag></a-space></div>
    </section>
  </template></a-spin></section>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getObject, getReferences } from '@/api/network/firewall'
import type { FirewallObject, ObjectKind, References } from '@/types/firewall'
import { visibleFields } from './presentation'
import { useWorkspace } from './workspace'
import StateTag from './state-tag.vue'
const props = defineProps<{ snapshot: number, kind: ObjectKind, id: number }>(); const emit = defineEmits<{ inspect: [kind: ObjectKind, id: number] }>(); const { t, te } = useI18n(); const workspace = useWorkspace(); const object = ref<FirewallObject>(); const references = ref<References>({ outgoing: [], incoming: [] })
function load() { object.value = undefined; void workspace.read(async signal => Promise.all([getObject(props.snapshot, props.kind, props.id, signal), getReferences(props.snapshot, props.kind, props.id, signal)]), ([value, refs]) => { object.value = value.data; references.value = refs.data }) }
watch(() => [props.snapshot, props.kind, props.id], load, { immediate: true })
</script>
