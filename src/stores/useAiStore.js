import { create } from 'zustand'
import { useAuthStore } from './useAuthStore.js'

// Never persist provider credentials or bearer tokens.
export const useAiStore = create((set) => ({
  modelId: '',
  providerApiKey: '',
  setModel: (modelId) => set({ modelId }),
  setKey: (providerApiKey) => set({ providerApiKey }),
  clear: () => set({ modelId: '', providerApiKey: '' }),
}))
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) useAiStore.getState().clear()
})
