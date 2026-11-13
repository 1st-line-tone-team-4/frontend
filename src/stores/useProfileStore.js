import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useProfileStore = create(
  persist(
    (set) => ({
      name: '선생님',
      setName: (name) => set({ name }),
      reset: () => set({ name: '선생님' }),
    }),
    { name: 'profile' },
  ),
)
