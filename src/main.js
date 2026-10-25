import { createApp } from 'vue'

import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import ArcoVue from '@arco-design/web-vue'
import ArcoIcons from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'
// Loaded before the project's own styles so both can build on the tokens
import '@/styles/tokens.css'
import '@/styles/index.scss' // global css
import '@/styles/admin.scss'
import '@/styles/arco.css'
// Loaded last so utility classes sit after the project's own styles.
// See the file header for why preflight is excluded.
import '@/styles/tailwind.css'

import { i18n, setupI18n } from '@/lang'

import App from './App'
import pinia from './stores'
import router from './router'
import permission from './directive/permission'

import { getDicts } from '@/api/admin/dict/data'
import { getItems, setItems } from '@/api/table'
import { getConfigKey } from '@/api/admin/sys-config'
import { parseTime, resetForm, selectDictLabel, /* download,*/ selectItemsLabel } from '@/utils/costum'
import { msgSuccess, msgError, msgInfo } from '@/utils/message'
import { setupErrorHandler } from '@/utils/error-log' // error log

import SvgIcon from './icons' // icon
import './permission' // permission control

// import Viser from 'viser-vue'
// Note: viser-vue 不支持 Vue 3，需要后续处理

import * as filters from './filters' // global filters

import Pagination from '@/components/Pagination'
import BasicLayout from '@/layout/BasicLayout'

import 'remixicon/fonts/remixicon.css'

console.info('欢迎使用 motor')

// 创建 Vue 应用实例
const app = createApp(App)

// 全局方法挂载（$前缀版本 + 无前缀版本同时注册，兼容历史代码）
// Message helpers now live in @/utils/message; this only registers them.
// New code should import them directly instead.
const globalMethods = {
  getDicts, getItems, setItems, getConfigKey,
  parseTime, resetForm, selectDictLabel, selectItemsLabel,
  msgSuccess, msgError, msgInfo
}

Object.entries(globalMethods).forEach(([key, fn]) => {
  app.config.globalProperties[key] = fn // this.getDicts(...)
  app.config.globalProperties['$' + key] = fn // this.$getDicts(...)
})

// 全局过滤器改为全局方法
app.config.globalProperties.$filters = filters

// 全局组件注册（Pagination 同时注册两个名称兼容历史模板）
app.component('AppPagination', Pagination)
app.component('Pagination', Pagination)
app.component('BasicLayout', BasicLayout)
app.component('SvgIcon', SvgIcon)

// 注册插件
app.use(pinia)
app.use(router)
app.use(permission)
app.use(i18n)
app.use(ArcoVue)
app.use(ArcoIcons)
// 设置错误处理器
setupErrorHandler(app)

// 挂载应用
// Mounting waits for the language pack so the first paint is already in the
// right language. For zh-CN -- bundled into the entry -- this resolves on the
// next microtask; only a visitor whose language has to be fetched waits on a
// request, and they would otherwise see a frame of Chinese.
setupI18n().finally(() => {
  app.mount('#app')

  // 应用挂载完成后淡出首屏加载层，动画结束再从 DOM 移除
  const loader = document.getElementById('loader-wrapper')
  if (loader) {
    document.body.classList.add('loaded')
    setTimeout(() => loader.remove(), 500)
  }
})
