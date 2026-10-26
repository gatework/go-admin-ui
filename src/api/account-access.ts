import request from '@/utils/request'
import type { ApiResponse } from '@/types/api'
export interface AccessSettings { enabled: boolean; emailConfigured: boolean; mfaConfigured: boolean }
export interface MFAStatus { enabled: boolean; configured: boolean; recoveryCodesRemaining: number }
export interface Enrollment { secret: string; uri: string; qr: string }
export const accessSettings = () => request<ApiResponse<AccessSettings>>({ url: '/api/v1/account/settings', method: 'get' })
export const registrationPolicy = () => request<ApiResponse<AccessSettings>>({ url: '/api/v1/account/registration-policy', method: 'get' })
export const saveRegistrationPolicy = (enabled: boolean) => request<ApiResponse<null>>({ url: '/api/v1/account/registration-policy', method: 'put', data: { enabled }})
export const sendRegistrationEmail = (email: string) => request<ApiResponse<{ token: string; resendAfter: number }>>({ url: '/api/v1/account/registration/email', method: 'post', data: { email }})
export const registerAccount = (data: Record<string, string>) => request<ApiResponse<null>>({ url: '/api/v1/account/register', method: 'post', data })
export const forgotPassword = (email: string) => request<ApiResponse<null>>({ url: '/api/v1/account/password/forgot', method: 'post', data: { email }})
export const resetPassword = (data: Record<string, string>) => request<ApiResponse<null>>({ url: '/api/v1/account/password/reset', method: 'post', data })
export const mfaStatus = () => request<ApiResponse<MFAStatus>>({ url: '/api/v1/account/mfa', method: 'get' })
export const setupMFA = (password: string) => request<ApiResponse<Enrollment>>({ url: '/api/v1/account/mfa/setup', method: 'post', data: { password }})
export const changeMFA = (operation: 'enable' | 'cancel' | 'disable' | 'regenerate', data: Record<string, string> = {}) => request<ApiResponse<{ recoveryCodes?: string[] }>>({ url: `/api/v1/account/mfa/${operation}`, method: 'post', data })
