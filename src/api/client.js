import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

// true 면 백엔드 없이 화면에 들어 있는 더미 데이터를 보여줘요 (.env.local 의 VITE_USE_MOCK)
// 백엔드 배포 후에는 false 로 바꾸면 실제 API 데이터가 보여요
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// 모든 API 요청은 이 인스턴스로 보내요 (baseURL 에 /v1 포함)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject({
      status: err.response?.status,
      code: err.response?.data?.error?.code ?? 'NETWORK_ERROR',
      message: err.response?.data?.error?.message ?? '요청을 처리할 수 없습니다.',
      details: err.response?.data?.error?.details ?? [],
      // 429 대응용 Retry-After 헤더 · AbortController 로 취소된 요청인지
      retryAfter: err.response?.headers?.['retry-after'] ?? null,
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
