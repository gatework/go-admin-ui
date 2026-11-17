/**
 * The operations overview. Module names and descriptions are read from the
 * modules' own packs; only the overview's own words live here.
 */
export default {
  title: '运维总览',
  description: '网络模块的规模与当前状态。数字来自各模块的实时接口，点击可进入对应页面。',
  modules: '功能模块',
  viewAll: '查看全部',
  unavailable: '暂时无法读取',
  noModules: '当前账户未开通网络管理模块',
  noModulesHelp: '请联系管理员在角色管理中分配菜单权限。',
  device: {
    total: '设备',
    ungrouped: '未分组 {count} 台',
    sync: '台账同步',
    lastSync: '最近成功 {time}',
    syncStates: { unconfigured: '未配置', idle: '空闲', running: '同步中', succeeded: '正常', failed: '失败' }
  },
  circuit: { total: '专线', monitored: '已接入监控 {count} 条' },
  fabric: {
    total: 'Fabric 区域',
    withIssues: '{count} 个区域存在待处理问题',
    title: 'Fabric 区域状态',
    empty: '尚无 Fabric 区域',
    coverage: '证据覆盖 {value}%',
    issues: '{count} 类问题'
  },
  wireless: { controllers: '无线控制器' },
  delivery: {
    total: '下发工单',
    title: '最近下发工单',
    empty: '尚无下发工单',
    progress: '{done} / {total} 台'
  }
}
