import request from '@/utils/request'
import type { ApiResponse } from '@/types/api'
import type { DiagnosticJob, DiagnosticRequest, DiagnosticServer } from '@/types/diagnostics'

const base = '/api/v1/network-diagnostics'
export const getDiagnosticServer = () => request<ApiResponse<DiagnosticServer>>({ url: `${base}/server`, method: 'get' })
export const startDiagnostic = (data: DiagnosticRequest) => request<ApiResponse<DiagnosticJob>>({ url: `${base}/jobs`, method: 'post', data })
export const getDiagnosticJob = (id: string) => request<ApiResponse<DiagnosticJob>>({ url: `${base}/jobs/${encodeURIComponent(id)}`, method: 'get' })
export const stopDiagnostic = (id: string) => request<ApiResponse<DiagnosticJob>>({ url: `${base}/jobs/${encodeURIComponent(id)}`, method: 'delete' })
