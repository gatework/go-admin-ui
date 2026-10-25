<template>
  <footer class="app-footer">
    <template v-if="appStore.copyrightEnabled">
      <span class="app-footer__copyright">
        © {{ copyrightYear }}
        <a
          v-if="companyUrl"
          class="app-footer__company"
          :href="companyUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ appStore.copyrightCompanyName }}
        </a>
        <span v-else class="app-footer__company">
          {{ appStore.copyrightCompanyName }}
        </span>
      </span>
      <span class="app-footer__dot" aria-hidden="true" />
    </template>
    <span class="app-footer__description">{{ footerDescription }}</span>
  </footer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import { isSafeExternalUrl } from '@/utils/external-url'

const appStore = useAppStore()
const { t } = useI18n()
const footerDescription = computed(
  () => appStore.footerDescription.trim() || t('footer.description')
)
const copyrightYear = new Date().getFullYear()
const companyUrl = computed(() =>
  isSafeExternalUrl(appStore.copyrightCompanyUrl)
    ? appStore.copyrightCompanyUrl
    : ''
)
</script>

<style lang="scss" scoped>
  .app-footer {
    display: flex;
    min-height: 44px;
    flex: 0 0 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 12px 2px;
    color: var(--motor-text-3);
    font-size: var(--motor-font-size-12);
    text-align: center;

    &__description {
      min-width: 0;
      overflow-wrap: anywhere;
      line-height: 1.6;
    }

    &__copyright {
      max-width: 100%;
      overflow-wrap: anywhere;
      line-height: 1.6;
    }

    &__company {
      color: var(--motor-primary);
      text-decoration: none;
      font-weight: 560;
    }

    a:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    &__dot {
      width: 3px;
      height: 3px;
      margin-bottom: 5px;
      border-radius: 50%;
      background: var(--motor-border-strong);
    }
  }

  @media (width <= 575px) {
    .app-footer {
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding-top: 10px;

      &__dot {
        display: none;
      }
    }
  }
</style>
