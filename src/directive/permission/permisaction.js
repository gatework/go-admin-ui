import { hasPermission } from '@/utils/permission'

/** `v-permisaction="['admin:sysPost:add']"`: removes the element unless the account holds one of the codes. */
export default {
  mounted(el, { value }) {
    if (!Array.isArray(value) || !value.length) throw new Error(`请设置操作权限标签值`)
    if (!hasPermission(value)) el.parentNode?.removeChild(el)
  }
}
