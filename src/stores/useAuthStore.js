import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 전역 상태 예시: 로그인 토큰 (새로고침해도 유지)
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null }),
    }),
    { name: 'auth' },
  ),
)
