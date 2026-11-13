import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 개념 학습(/study)에서 설명을 읽은 개념 (서버에 할 일이 없어 이 기기에만 저장)
// read: { [concept_version_id]: 읽은 시각 }
export const useConceptReadStore = create(
  persist(
    (set) => ({
      read: {},
      markRead: (conceptVersionId) =>
        set((s) =>
          typeof s.read[conceptVersionId] === 'number'
            ? s
            : { read: { ...s.read, [conceptVersionId]: Date.now() } },
        ),
      // 오늘 화면 '건너뛰기'(이미 아는 개념) · '되돌리기'
      skip: (conceptVersionId) =>
        set((s) => ({ read: { ...s.read, [conceptVersionId]: 'skipped' } })),
      unmark: (conceptVersionId) =>
        set((s) => {
          const read = { ...s.read }
          delete read[conceptVersionId]
          return { read }
        }),
    }),
    { name: 'concept-read' },
  ),
)
