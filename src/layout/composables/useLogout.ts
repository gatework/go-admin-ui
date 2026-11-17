import { useRouter } from 'vue-router'
import { i18n } from '@/lang'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/modal'

/** Confirm, sign out, land on the login page. One place, so the header menu and the shortcut agree. */
export function useLogout() {
  const router = useRouter()
  return async() => {
    try {
      await confirmAction({ content: i18n.global.t('layout.logoutConfirm'), okText: i18n.global.t('layout.logout') })
      await useUserStore().LogOut()
      await router.replace('/login')
    } catch { /* Cancelled, or the request client already reported the failure. */ }
  }
}
