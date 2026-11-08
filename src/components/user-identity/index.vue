<template>
  <div
    class="user-identity"
    :class="{
      'user-identity--compact': compact,
    }"
  >
    <span class="user-identity__avatar-wrap">
      <a-avatar
        :key="`${avatarUrl || ''}:${avatarFailed}`"
        class="user-identity__avatar"
        :size="size"
        :image-url="avatarFailed ? undefined : avatarUrl"
        @error="avatarFailed = true"
      >
        {{ initial }}
      </a-avatar>
      <i
        v-if="online"
        class="user-identity__status"
        role="status"
        :aria-label="statusLabel"
      />
    </span>
    <span v-if="!avatarOnly" class="user-identity__copy">
      <strong :title="displayName">{{ displayName }}</strong>
      <small :title="secondaryText">{{ secondaryText }}</small>
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string;
    username?: string;
    avatarUrl?: string;
    subtitle?: string;
    size?: number;
    compact?: boolean;
    avatarOnly?: boolean;
    online?: boolean;
    statusLabel?: string;
  }>(),
  {
    name: '',
    username: '',
    avatarUrl: undefined,
    subtitle: '',
    size: 38,
    compact: false,
    avatarOnly: false,
    online: false,
    statusLabel: 'Online'
  }
)

const avatarFailed = ref(false)
watch(() => props.avatarUrl, () => { avatarFailed.value = false })
const displayName = computed(() => props.name || props.username || '-')
const secondaryText = computed(
  () => props.subtitle || (props.username ? `@${props.username}` : '-')
)
const initial = computed(() =>
  displayName.value.slice(0, 1).toLocaleUpperCase()
)
</script>

<style scoped lang="scss">
  .user-identity {
    display: inline-flex;
    min-width: 0;
    max-width: 100%;
    align-items: center;
    gap: 11px;

    &__avatar-wrap {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
    }

    &__avatar {
      background: var(--motor-avatar-background);
      box-shadow: var(--motor-avatar-shadow);
      color: #fff;
      font-weight: 720;
    }

    &__status {
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 11px;
      height: 11px;
      border: 2px solid var(--motor-surface);
      border-radius: 50%;
      background: rgb(var(--green-6));
      box-shadow: 0 0 0 1px rgba(var(--green-6), 0.28);

      &::after {
        position: absolute;
        inset: -5px;
        border: 1px solid rgba(var(--green-6), 0.88);
        border-radius: inherit;
        animation: user-status-breathe 2.4s cubic-bezier(0.16, 1, 0.3, 1)
          infinite;
        content: '';
      }
    }

    &__copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      text-align: left;

      strong,
      small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      strong {
        color: var(--motor-text-1);
        font-size: var(--motor-font-size-14);
        font-weight: 650;
        line-height: 20px;
      }

      small {
        color: var(--motor-text-3);
        font-size: var(--motor-font-size-11);
        line-height: 17px;
      }
    }

    &--compact {
      gap: 9px;

      .user-identity__copy strong {
        font-size: var(--motor-font-size-13);
        line-height: 18px;
      }

      .user-identity__copy small {
        line-height: 14px;
      }
    }
  }

  @keyframes user-status-breathe {
    0%,
    100% {
      opacity: 0.22;
      transform: scale(0.82);
    }

    50% {
      opacity: 0.82;
      transform: scale(1.55);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .user-identity__status::after {
      animation: none;
      opacity: 0.42;
      transform: scale(1);
    }
  }
</style>
