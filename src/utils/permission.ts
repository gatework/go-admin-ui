import { useUserStore } from '@/stores/user'

/** Held by the super administrator: grants every action. */
export const ALL_PERMISSIONS = '*:*:*'

/**
 * Whether the signed-in account holds any of `codes` (`模块:资源:操作`).
 *
 * The one rule behind both `v-permisaction` and `usePermission`, so a button
 * hidden by the directive and a branch guarded in script cannot disagree.
 */
export function hasPermission(codes: readonly string[]): boolean {
  const held = useUserStore().permisaction
  return held.some(code => code === ALL_PERMISSIONS || codes.includes(code))
}

/** Whether the signed-in account has any of `roles`. Backs `v-permission`. */
export function hasRole(roles: readonly string[]): boolean {
  return useUserStore().roles.some(role => roles.includes(role))
}
