/** Shared interface labels and recovery messages. */
export default {
  confirm: '确定',
  cancel: '取消',
  notice: '提示',
  reset: '重置',
  search: '搜索',
  refresh: '刷新',
  actions: '操作',
  close: '关闭',
  empty: '暂无数据',
  selectPlaceholder: '请选择',
  loading: '加载中',

  // The toolbar and row actions every list page repeats, and the column every
  // one of them ends with. All five admin pages migrated so far carry each of
  // these; sys-role and sys-config carry 导出 as well.
  add: '新增',
  edit: '修改',
  delete: '删除',
  enable: '启用',
  disable: '停用',
  export: '导出',
  createdAt: '创建时间',

  // Data-entry forms save; confirmations can name their own action.
  dialogConfirm: '保存',
  dialogCancel: '取 消',

  // What utils/request.ts says when a request cannot be completed. They sit
  // here rather than in a module of their own because the interceptor has no
  // component instance and no page to belong to -- it speaks for every one of
  // them.
  systemNotice: '系统提示',
  relogin: '重新登录',
  sessionExpired: '登录状态已过期',
  sessionExpiredPrompt: '登录已过期，请重新登录后继续操作。取消后将留在当前页面。',
  networkError: '无法连接服务器，请检查网络后重试；若仍失败，请联系管理员。',

  // What the router guard reports when the menu cannot be built -- stores/
  // permission.ts throws it, src/permission.js turns it into a toast. Same
  // reason as the block above: the guard runs before any page exists.
  menuLoadFailed: '菜单加载失败，请刷新页面重试；若仍失败，请联系管理员。',

  // Shown by components/AppNotInstalled when the menu names a component this
  // build does not contain. Same nature as menuLoadFailed above -- it belongs
  // to route resolution rather than to any one page, so there is no directory
  // under src/views for it to mirror.
  appNotInstalled: '此功能暂不可用，请联系管理员检查应用安装和菜单配置。',

  // Fallback when no more specific failure message is available.
  unknownError: '操作未完成，请重试；若仍失败，请联系管理员。',
  requestTimeout: '请求超时，请稍后重试。'
}
