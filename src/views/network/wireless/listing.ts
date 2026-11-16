import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useTable } from '@/composables'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { WirelessQuery } from '@/types/network-wireless'

// Retain evidence only for an identical query. A failed new search must never
// present the previous search's rows under different filters.
export function useListing<T extends { id: number }>(options: {
  active: Ref<boolean>
  api: (query: WirelessQuery & PageQuery, signal: AbortSignal) => Promise<ApiResponse<PageResult<T>>>
  defaultQuery?: () => WirelessQuery
  accepted?: (query: WirelessQuery) => void
}) {
  const failed = ref(false)
  let abort: AbortController | undefined
  let retained: { key: string, response: ApiResponse<PageResult<T>> } | undefined
  const table = useTable<T, WirelessQuery>({ idKey: 'id', defaultQuery: options.defaultQuery, api: async input => {
    const query = { ...input }; const key = JSON.stringify(query)
    abort?.abort(); const request = new AbortController(); abort = request
    try {
      if (!options.active.value) throw new DOMException('Inactive wireless listing', 'AbortError')
      const response = await options.api(query, request.signal)
      if (!options.active.value || request.signal.aborted) throw new DOMException('Superseded wireless listing', 'AbortError')
      retained = { key, response }; failed.value = false; options.accepted?.(query)
      return response
    } catch(error) {
      if (options.active.value && !request.signal.aborted) failed.value = true
      if (retained?.key === key) return retained.response
      throw error
    }
  } })
  watch(options.active, value => { if (!value) abort?.abort(); else void table.getList() }, { flush: 'sync' })
  onBeforeUnmount(() => abort?.abort())
  return { table, failed }
}
