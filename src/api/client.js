import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// 모든 API 요청은 이 인스턴스로 보내요
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 요청마다 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답: { data } 형식이면 data만 꺼내고, 오류는 한 형태로 정리
api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout()
    return Promise.reject({
      status: err.response?.status,
      code: err.response?.data?.error?.code ?? 'NETWORK_ERROR',
      message: err.response?.data?.error?.message ?? '요청을 처리할 수 없습니다.',
    })
  },
)

// 백엔드 없이 개발할 때 쓰는 가짜 응답
export const mockResponse = (data, ms = 300) => new Promise((r) => setTimeout(() => r(data), ms))
