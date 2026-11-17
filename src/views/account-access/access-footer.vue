<template>
  <footer class="access-footer">
    <span>© {{ year }} {{ APP_META.name }}</span>
    <span class="access-footer__dot" aria-hidden="true" />
    <span>{{ $t('footer.description') }}</span>
  </footer>
</template>

<script setup lang="ts">
/** The credit line under the sign-in forms. The application shell has no footer. */
import { APP_META } from '@/config/app-meta'

const year = new Date().getFullYear()
</script>

<style lang="scss" scoped>
.access-footer {
  display: flex;
  min-height: 44px;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 10px;
  padding: 14px 12px 2px;
  color: var(--motor-text-3);
  font-size: var(--motor-font-size-12);
  line-height: 1.6;
  text-align: center;

  &__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--motor-border-strong); }
}

// Two lines on a phone: the credit, then the tagline.
@media (width <= 575px) {
  .access-footer { flex-direction: column; gap: 4px; padding-top: 10px; }
  .access-footer__dot { display: none; }
}
</style>
