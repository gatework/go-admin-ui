import permission from './permission'
import permisaction from './permisaction'

/** Registers `v-permission` (by role) and `v-permisaction` (by permission code). */
export default {
  install(app) {
    app.directive('permission', permission)
    app.directive('permisaction', permisaction)
  }
}
