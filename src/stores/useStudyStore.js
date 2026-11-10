import { create } from 'zustand'
import { useAuthStore } from './useAuthStore.js'

const empty = {
  materialId: null,
  examGoalId: null,
  planId: null,
  questionSetId: null,
  sessionId: null,
}
// Identity is carried by URLs and server records. Never restore another login's IDs.
export const useStudyStore = create((set) => ({
  ...empty,
  setIds: (ids) => set(ids),
  reset: () => set(empty),
}))
try {
  globalThis.localStorage?.removeItem('study')
} catch {
  /* Storage may be disabled. */
}
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) useStudyStore.getState().reset()
})
