import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 화면 사이에서 이어지는 학습 흐름의 ID (새로고침해도 유지)
export const useStudyStore = create(
  persist(
    (set) => ({
      materialId: null,
      examGoalId: null,
      planId: null,
      questionSetId: null,
      sessionId: null,
      setIds: (ids) => set(ids),
      reset: () =>
        set({
          materialId: null,
          examGoalId: null,
          planId: null,
          questionSetId: null,
          sessionId: null,
        }),
    }),
    { name: 'study' },
  ),
)
