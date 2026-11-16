import request from '@/utils/request'
import type { ApiResponse, PageQuery, PageResult } from '@/types/api'
import type { Fabric, FabricDetail, FabricQuery, RuleSet, Rule, Member, Endpoint, EndpointQuery, Collection, CollectionMode, Change, ChangeInput, ChangeCandidateInput, ChangeCandidates } from '@/types/network-fabric'

const base = '/api/v1/network-fabrics'
export const listFabric = (params: FabricQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Fabric>>>({ url: base, params, signal })
export const getFabric = (id: number, signal?: AbortSignal) => request<ApiResponse<FabricDetail>>({ url: `${base}/${id}`, signal })
export const getRules = () => request<ApiResponse<RuleSet>>({ url: `${base}/rules` })
export const previewRules = (rules: Rule[]) => request<ApiResponse<Member[]>>({ url: `${base}/rules/preview`, method: 'post', data: { rules }})
export const updateRules = (data: Pick<RuleSet, 'version' | 'rules'>) => request<ApiResponse<RuleSet>>({ url: `${base}/rules`, method: 'put', data })
export const listMember = (params: FabricQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Member>>>({ url: `${base}/members`, params, signal })
export const updateMember = (id: number, data: { fabricId: number | null, mode: 'auto' | 'manual' }) => request<ApiResponse<Member>>({ url: `${base}/members/${id}`, method: 'put', data })
export const listEndpoint = (params: EndpointQuery & PageQuery, signal?: AbortSignal) => request<ApiResponse<PageResult<Endpoint>>>({ url: `${base}/endpoints`, params, signal })
export const updateSettings = (id: number, data: Pick<Fabric, 'version' | 'collectionEnabled' | 'runtimeMinutes' | 'configMinutes'>) => request<ApiResponse<Fabric>>({ url: `${base}/${id}/settings`, method: 'put', data })
export const listCollection = (id: number, params: PageQuery & { status?: 'active' }, signal?: AbortSignal) => request<ApiResponse<PageResult<Collection>>>({ url: `${base}/${id}/collections`, params, signal })
export const addCollection = (id: number, data: { requestKey: string, mode: CollectionMode }) => request<ApiResponse<Collection>>({ url: `${base}/${id}/collections`, method: 'post', data })
export const getCollection = (id: number, signal?: AbortSignal) => request<ApiResponse<Collection>>({ url: `${base}/collections/${id}`, signal })
export const listChange = (id: number, params: PageQuery & { status?: 'active' }, signal?: AbortSignal) => request<ApiResponse<PageResult<Change>>>({ url: `${base}/${id}/changes`, params, signal })
export const addChange = (id: number, data: ChangeInput & { requestKey: string }) => request<ApiResponse<Change>>({ url: `${base}/${id}/changes`, method: 'post', data })
export const getChangeCandidates = (id: number, data: ChangeCandidateInput, signal?: AbortSignal) => request<ApiResponse<ChangeCandidates>>({ url: `${base}/${id}/change-candidates`, method: 'post', data, signal })
export const getChange = (id: number, signal?: AbortSignal) => request<ApiResponse<Change>>({ url: `${base}/changes/${id}`, signal })
export const executeChange = (id: number, version: number) => request<ApiResponse<Change>>({ url: `${base}/changes/${id}/execute`, method: 'post', data: { version }})
export const cancelChange = (id: number, version: number) => request<ApiResponse<Change>>({ url: `${base}/changes/${id}/cancel`, method: 'post', data: { version }})
