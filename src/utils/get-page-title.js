import { resolveAppName } from '@/config/app-meta'
import storage from '@/utils/storage'

export default function getPageTitle(pageTitle) {
  const app_info = storage.get('app_info')
  const title = resolveAppName(app_info?.sys_app_name)
  if (pageTitle) {
    return `${pageTitle} - ${title}`
  }
  return `${title}`
}
