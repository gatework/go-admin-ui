import { hasPermission } from '@/utils/permission'

/**
 * Permission checks for script and for conditions a directive cannot express
 * (a column that exists only for editors, a width that depends on the actions).
 *
 *   const { can } = usePermission('network:device')
 *   can('edit')            // network:device:edit
 *   can('query', 'edit')   // either
 *
 * Reads the user store on each call, so a computed that calls `can` follows a
 * change of account. In templates that only show or hide one element, prefer
 * `v-permisaction`.
 */
export function usePermission(resource: string) {
  const can = (...actions: string[]) => hasPermission(actions.map(action => `${resource}:${action}`))
  return { can }
}
