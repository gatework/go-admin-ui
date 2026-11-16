import type { EChartsOption } from 'echarts'
import type { TrafficSeries } from '@/types/network-circuit'

export function formatRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return '—'
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
  let scaled = value
  let index = 0
  while (scaled >= 1000 && index < units.length - 1) { scaled /= 1000; index++ }
  return `${Number(scaled.toFixed(2))} ${units[index]}`
}
export function trafficChartOptions(series: TrafficSeries[], labels: Record<'in' | 'out', string>, colors: { text: string, grid: string, in: string, out: string }, timeZone: string): EChartsOption {
  const time = (value: number) => new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(value)
  return {
    animation: false, backgroundColor: 'transparent', textStyle: { color: colors.text },
    grid: { left: 12, right: 20, top: 44, bottom: 16, containLabel: true },
    tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: value => formatRate(typeof value === 'number' ? value : null) },
    legend: { top: 0, textStyle: { color: colors.text }},
    xAxis: { type: 'time', axisLabel: { color: colors.text, formatter: time, hideOverlap: true }, axisLine: { lineStyle: { color: colors.grid }}, splitLine: { show: false }},
    yAxis: { type: 'value', min: 0, axisLabel: { color: colors.text, formatter: formatRate }, splitLine: { lineStyle: { color: colors.grid }}},
    series: series.map(item => ({ name: labels[item.direction], type: 'line', connectNulls: false, showSymbol: false, data: item.points, color: colors[item.direction], lineStyle: { width: 2, type: item.direction === 'in' ? 'solid' : 'dashed' }, emphasis: { disabled: true }}))
  }
}
