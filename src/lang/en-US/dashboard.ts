/**
 * The operations overview. Module names and descriptions are read from the
 * modules' own packs; only the overview's own words live here.
 */
export default {
  title: 'Operations Overview',
  description: 'Size and current state of the network modules. Figures come from each module\'s live endpoints; select one to open its page.',
  modules: 'Modules',
  viewAll: 'View all',
  unavailable: 'Unavailable right now',
  noModules: 'No network module is enabled for this account',
  noModulesHelp: 'Ask an administrator to assign menu permissions under Role Management.',
  device: {
    total: 'Devices',
    ungrouped: '{count} ungrouped',
    sync: 'Inventory sync',
    lastSync: 'Last success {time}',
    syncStates: { unconfigured: 'Not configured', idle: 'Idle', running: 'Syncing', succeeded: 'Healthy', failed: 'Failed' }
  },
  circuit: { total: 'Circuits', monitored: '{count} monitored' },
  fabric: {
    total: 'Fabric regions',
    withIssues: '{count} regions with open issues',
    title: 'Fabric region status',
    empty: 'No Fabric regions yet',
    coverage: 'Evidence {value}%',
    issues: '{count} issue types'
  },
  wireless: { controllers: 'Wireless controllers' },
  delivery: {
    total: 'Delivery orders',
    title: 'Recent delivery orders',
    empty: 'No delivery orders yet',
    progress: '{done} / {total} devices'
  }
}
