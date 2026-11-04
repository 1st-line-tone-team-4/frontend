import { api, USE_MOCK, mockResponse } from './client'

// API 함수 예시 · 실제 기능이 생기면 today.js, plan.js 처럼 파일을 나눠 추가
export async function getExample() {
  if (USE_MOCK) return mockResponse({ message: '목 데이터 응답 성공' })
  return api.get('/health')
}
