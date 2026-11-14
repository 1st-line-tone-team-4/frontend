import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

// true 면 백엔드 없이 화면에 들어 있는 더미 데이터를 보여줘요 (.env.local 의 VITE_USE_MOCK)
// 백엔드 배포 후에는 false 로 바꾸면 실제 API 데이터가 보여요
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// 명세 servers 는 /v1 · 환경 변수에 /v1 이 빠져 있으면 붙여요
const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const API_BASE_URL = /\/v1$/.test(base) ? base : `${base}/v1`

// 모든 API 요청은 이 인스턴스로 보내요
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

api.interceptors.request.use((config) => {
  // 요청마다 토큰 자동 첨부
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  // 명세: 모든 POST 는 Idempotency-Key 헤더 필수 (16~128자)
  if (config.method === 'post' && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = newIdempotencyKey()
  }
  return config
})

// 응답: 본문 그대로 반환 ({ data, next_cursor } 형식) · 오류는 한 형태로 정리
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const res = err.response
    if (res?.status === 401) useAuthStore.getState().logout()
    const apiError = res?.data?.error
    // 서버 오류 형식({ error: { code, message } })이 아닐 때 원인을 구분해서 알려줘요
    let code = apiError?.code
    let message = apiError?.message
    if (!apiError) {
      if (axios.isCancel(err)) {
        code = 'CANCELED'
        message = '요청이 취소됐어요.'
      } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        code = 'TIMEOUT'
        message = `서버 응답이 ${Math.round((err.config?.timeout ?? 0) / 1000)}초 넘게 없어요. 잠시 후 다시 시도해 주세요.`
      } else if (!res) {
        code = 'NETWORK_ERROR'
        message = '서버에 연결하지 못했어요. 네트워크나 서버 상태를 확인해 주세요.'
      } else {
        code = `HTTP_${res.status}`
        message = `서버 오류가 발생했어요. (HTTP ${res.status})`
      }
      console.error('[api]', err.config?.method?.toUpperCase(), err.config?.url, code, res?.data ?? err.message)
    }
    return Promise.reject({
      status: res?.status,
      code,
      message,
      details: apiError?.details ?? [],
      requestId: apiError?.request_id ?? null,
      // 429 대응용 Retry-After 헤더 · AbortController 로 취소된 요청인지
      retryAfter: res?.headers?.['retry-after'] ?? null,
      canceled: axios.isCancel(err),
    })
  },
)

// { data } 만 꺼내기
export const unwrap = (body) => body?.data

// 목록 응답 { data, next_cursor } → { items, nextCursor }
export const unwrapList = (body) => ({
  items: body?.data ?? [],
  nextCursor: body?.next_cursor ?? null,
})

// 백엔드 없이 개발할 때 쓰는 가짜 응답
export const mockResponse = (data, ms = 300) => new Promise((r) => setTimeout(() => r(data), ms))
