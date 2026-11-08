<template>
  <div class="page-container">
    <header v-if="title" class="page-container__header">
      <div class="page-container__heading">
        <h1>{{ title }}</h1>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-container__actions"><slot name="actions" /></div>
    </header>
    <a-card v-if="card" class="page-container__body">
      <slot />
    </a-card>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
/**
 * Page shell: consistent padding, an optional heading, and a card for the
 * pages that want one.
 *
 * Supersedes BasicLayout, which offered padding through a named `#wrapper` slot
 * -- so every page opened with a template block whose only purpose was to fill
 * a slot, and then repeated `<a-card class="box-card">` inside it.
 *
 * The card is off by default because a list page no longer wants one: ProTable
 * draws its own two, and a card around them puts a border round a pair of
 * borders. Pages that are a single surface -- a form, a console -- pass `card`
 * and get the panel back.
 *
 * The heading is opt-in. Admin list pages leave it off: the tab already names
 * the page. A module whose pages carry page-level actions or need one line of
 * orientation (network management) passes `title`, `description` and
 * `#actions`, so every such page opens the same way instead of each drawing its
 * own header.
 */
defineOptions({ name: 'PageContainer' })

withDefaults(defineProps<{
  /** Wrap the content in a card. Off by default; pages that draw their own panels need nothing. */
  card?: boolean
  /** Page heading. Omit for no header. */
  title?: string
  /** One line under the heading saying what the page is for. */
  description?: string
}>(), {
  card: false,
  title: undefined,
  description: undefined
})
</script>

<style lang="scss" scoped>
.page-container {
  padding: 12px;
  box-sizing: border-box;
}

.page-container__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 24px;
  flex-wrap: wrap;
  padding: 4px 0 16px;
}

.page-container__heading {
  min-width: 0;
  flex: 1 1 320px;

  h1 {
    margin: 0;
    color: var(--color-text-1);
    font-size: var(--motor-font-size-20);
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 4px 0 0;
    max-width: 72ch;
    color: var(--color-text-2);
    font-size: var(--motor-font-size-13);
    line-height: 1.6;
  }
}

.page-container__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/*
 * Edge to edge on a phone.
 *
 * The 12px gutter plus a card's border and radius spend roughly 30px of a 375px
 * screen on framing content that has nothing beside it to be framed against. On
 * a desktop a card separates the page from a wide grey field; on a phone it is
 * the whole viewport.
 *
 * The border rule is for this component's own card; the padding one is written
 * against every card under the container, so it also reaches the pair ProTable
 * draws, which is what most list pages have here instead.
 */
@media (max-width: 767px) {
  .page-container { padding: 0; }

  .page-container__header {
    align-items: stretch;
    padding: 12px 12px 12px;
  }

  .page-container__heading h1 { font-size: var(--motor-font-size-18); }

  .page-container__actions :deep(.arco-btn) { min-height: 36px; }

  .page-container__body {
    border: 0;
    border-radius: 0;
  }

  :deep(.arco-card-body) { padding: 12px; }
}
</style>
