import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 전역 상태 예시: 로그인 토큰 (새로고침해도 유지)
export const useAuthStore = create(
  persist(
    (set) => ({
      // 명세에 로그인 API 가 아직 없어서, 개발 중엔 .env.local 의 VITE_ACCESS_TOKEN 을 써요
      accessToken: import.meta.env.VITE_ACCESS_TOKEN || null,
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: import.meta.env.VITE_ACCESS_TOKEN || null }),
    }),
    { name: 'auth' },
  ),
)
