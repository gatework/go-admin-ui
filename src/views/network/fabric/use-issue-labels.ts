import { useI18n } from 'vue-i18n'
import type { IssueGroup, IssueStatus } from '@/types/network-fabric'

export function useIssueLabels() {
  const { t, te } = useI18n()
  function groupTitle(group: IssueGroup) {
    const key = `networkFabric.problem.checks.${group.check}`
    if (te(key)) return t(key)
    if (group.check.startsWith('runtime_')) {
      const dimension = group.check.slice(8)
      const dimensionKey = `networkFabric.dimensionsLabels.${dimension}`
      return t('networkFabric.problem.runtimeCheck', { dimension: te(dimensionKey) ? t(dimensionKey) : dimension })
    }
    return group.title
  }
  function reasonLabel(reason: string) {
    const key = `networkFabric.problem.reasons.${reason}`
    return te(key) ? t(key) : t('networkFabric.problem.reasonUnknown', { code: reason })
  }
  function scopeLabel(group: IssueGroup) {
    const business = group.scope === 'fabric' && group.vni ? t('networkFabric.problem.fabricScope') : group.vrf || t(group.vni ? 'networkFabric.problem.defaultVRF' : 'networkFabric.problem.infrastructure')
    const direction = group.direction ? t(group.direction === 'in' ? 'networkFabric.aclIn' : 'networkFabric.aclOut') : ''
    return [business, group.vni ? `VNI ${group.vni}` : '', direction].filter(Boolean).join(' · ')
  }
  const statusLabel = (status?: IssueStatus) => status ? t(`networkFabric.problem.statuses.${status}`) : '—'
  return { groupTitle, reasonLabel, scopeLabel, statusLabel }
}
