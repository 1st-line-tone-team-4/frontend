import { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/useAuthStore.js'
import { useStudyStore } from '../stores/useStudyStore.js'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) {
    void queryClient.cancelQueries()
    queryClient.clear()
    useStudyStore.getState().reset()
  }
})
