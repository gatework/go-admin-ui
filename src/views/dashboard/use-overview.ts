import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { usePageSession } from '@/composables/usePageSession'
import { silently } from '@/utils/request'
import { getDeviceSyncStatus, listDeviceGroup } from '@/api/network/device'
import { listCircuit } from '@/api/network/circuit'
import { listDelivery } from '@/api/network/delivery'
import { listFabric } from '@/api/network/fabric'
import { listController } from '@/api/network/wireless'
import type { DeviceSyncStatus } from '@/types/network'
import type { DeliveryOrder } from '@/types/network-delivery'
import type { Fabric } from '@/types/network-fabric'

/**
 * One module's slice of the overview.
 *
 * `available` comes from the menu: a module whose page this account cannot
 * open is neither fetched nor drawn. `failed` is kept apart from "no data" so a
 * tile can say which it is -- an unreachable Zabbix is not zero circuits.
 */
export interface Slice<T> {
  /** Route name of the module's page; also what the tile links to. */
  route: string
  available: boolean
  loading: boolean
  failed: boolean
  data?: T
}

export interface OverviewData {
  device: Slice<{ total: number, ungrouped: number, sync: DeviceSyncStatus }>
  circuit: Slice<{ total: number, monitored: number }>
  fabric: Slice<{ total: number, withIssues: number, regions: Fabric[] }>
  wireless: Slice<{ controllers: number }>
  delivery: Slice<{ total: number, recent: DeliveryOrder[] }>
}

/** How many Fabric regions the overview reads. A deployment has a handful; this is a ceiling, not a page. */
const FABRIC_LIMIT = 50
const one = { pageIndex: 1, pageSize: 1 }

/**
 * Loads the overview, one module at a time and independently.
 *
 * Every read goes through `silently`: a module that is down shows as a failed
 * tile, not as a toast over a page the reader only glanced at.
 */
export function useOverview() {
  const router = useRouter()
  const slice = <T>(route: string): Slice<T> => ({ route, available: router.hasRoute(route), loading: false, failed: false, data: undefined })

  const overview = reactive<OverviewData>({
    device: slice('NetworkDeviceManage'),
    circuit: slice('NetworkCircuitManage'),
    fabric: slice('NetworkFabricManage'),
    wireless: slice('NetworkWirelessManage'),
    delivery: slice('NetworkDeliveryManage')
  })

  const session = usePageSession({ onResume: () => { void refresh() } })

  const loaders: { [K in keyof OverviewData]: (signal: AbortSignal) => Promise<NonNullable<OverviewData[K]['data']>> } = {
    device: async() => {
      const [groups, sync] = await Promise.all([listDeviceGroup(), getDeviceSyncStatus()])
      return { total: groups.data.totalDeviceCount, ungrouped: groups.data.ungroupedDeviceCount, sync: sync.data }
    },
    circuit: async signal => {
      const [all, monitored] = await Promise.all([listCircuit(one, signal), listCircuit({ ...one, monitored: 'true' }, signal)])
      return { total: all.data.count, monitored: monitored.data.count }
    },
    fabric: async signal => {
      const { data } = await listFabric({ pageIndex: 1, pageSize: FABRIC_LIMIT }, signal)
      // Most pressing first: the panel shows the top of this list.
      const regions = [...data.list].sort((a, b) => b.issueCount - a.issueCount)
      return { total: data.count, withIssues: regions.filter(region => region.issueCount > 0).length, regions }
    },
    wireless: async signal => ({ controllers: (await listController(one, signal)).data.count }),
    delivery: async signal => {
      const { data } = await listDelivery({ pageIndex: 1, pageSize: 5 }, signal)
      return { total: data.count, recent: data.list }
    }
  }

  async function load<K extends keyof OverviewData>(key: K) {
    const target = overview[key] as Slice<unknown>
    if (!target.available) return
    const current = session.guard()
    target.loading = true
    try {
      const data = await silently(() => loaders[key](session.signal))
      if (!current()) return
      target.data = data
      target.failed = false
    } catch {
      if (current()) target.failed = true
    } finally {
      if (current()) target.loading = false
    }
  }

  const refresh = () => Promise.all((Object.keys(overview) as Array<keyof OverviewData>).map(load))

  return { overview, refresh }
}
