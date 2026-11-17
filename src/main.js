import { createApp } from 'vue'

import 'normalize.css/normalize.css' // a modern alternative to CSS resets

import ArcoVue from '@arco-design/web-vue'
import ArcoIcons from '@arco-design/web-vue/es/icon'
import '@arco-design/web-vue/dist/arco.css'
// After Arco, so the project's tokens and overrides win at equal specificity.
import '@/styles/tokens.css'
import '@/styles/index.scss'

import { i18n, setupI18n } from '@/lang'

import App from './App'
import pinia from './stores'
import router from './router'
import permission from './directive/permission'

import SvgIcon from './icons' // icon
import './permission' // permission control

import 'remixicon/fonts/remixicon.css'

console.info('欢迎使用 motor')

// 创建 Vue 应用实例
const app = createApp(App)

app.component('SvgIcon', SvgIcon)

// 注册插件
app.use(pinia)
app.use(router)
app.use(permission)
app.use(i18n)
app.use(ArcoVue)
app.use(ArcoIcons)

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
