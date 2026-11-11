import { create } from 'zustand'

const clearedStorage = new WeakSet()

// Remove only the previous scaffold's key. Never read, parse or hydrate its token.
export function clearLegacyAuthStorage(storage) {
  try {
    const target = storage ?? globalThis.localStorage
    if (!target || clearedStorage.has(target)) return false
    clearedStorage.add(target)
    target.removeItem('auth')
    return true
  } catch {
    // Storage can be disabled by the browser. Authentication still stays in memory.
    return false
  }
}

clearLegacyAuthStorage()

export function createAuthStore() {
  return create((set, get) => ({
    accessToken: null,
    sessionVersion: 0,
    setToken: (token) => {
      if (typeof token !== 'string' || !token.trim() || /\s/.test(token.trim()))
        throw new TypeError('A valid access token is required.')
      set((state) => ({ accessToken: token.trim(), sessionVersion: state.sessionVersion + 1 }))
    },
    logout: () => set((state) => ({ accessToken: null, sessionVersion: state.sessionVersion + 1 })),
    logoutIfCurrent: (sessionVersion) => {
      if (get().sessionVersion !== sessionVersion) return false
      get().logout()
      return true
    },
  }))
}

export const useAuthStore = createAuthStore()
