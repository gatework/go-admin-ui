import { Message } from '@arco-design/web-vue'

/**
 * Global message helpers.
 *
 * These were previously defined inline in main.js and could only be reached via
 * `this.msgSuccess(...)`. Extracting them into a module also allows
 * `import { msgSuccess } from '@/utils/message'`.
 *
 * `<script setup>` has no `this`, so components migrated to the Composition API
 * must use the import form. main.js still registers them on globalProperties for
 * the Options API components that have not been migrated yet; drop that
 * registration once every page is migrated.
 */

/**
 * Pass a translated string, never `response.msg`.
 *
 * Call sites used to read `msgSuccess(response.msg || t('...'))`, which put the
 * server in charge of the wording and left the translation as a fallback that
 * almost never ran -- these endpoints all answer with a message. The result was
 * wrong in both directions at once: an English user saw 修改成功, and a Chinese
 * user generating code saw the generator's "Code generated successfully！",
 * because that endpoint happens to answer in English.
 *
 * Errors are the other way round and still read the server's message: a failure
 * carries a reason the frontend has no copy for.
 */
export const msgSuccess = (msg: string) =>
  Message.success({ closable: true, content: msg })

export const msgError = (msg: string) =>
  Message.error({ closable: true, content: msg })

export const msgInfo = (msg: string) => Message.info(msg)
