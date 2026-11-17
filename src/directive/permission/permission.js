import { hasRole } from '@/utils/permission'

/** `v-permission="['admin']"`: removes the element unless the account has one of the roles. */
export default {
  mounted(el, { value }) {
    if (!Array.isArray(value) || !value.length) throw new Error(`need roles! Like v-permission="['admin','editor']"`)
    if (!hasRole(value)) el.parentNode?.removeChild(el)
  }
}
