import axios from 'axios'
import { useAuthStore } from '../stores/useAuthStore.js'

const env = import.meta.env ?? {}

export class ApiError extends Error {
  constructor(
    message,
    {
      status = null,
      code = 'NETWORK_ERROR',
      request_id = null,
      details = [],
      retryAfter = null,
      canceled = false,
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    Object.assign(this, { status, code, request_id, details, retryAfter, canceled })
  }
}

export function canceledError() {
  return new ApiError('The request was canceled.', { code: 'CANCELED', canceled: true })
}

export function isCanceledError(error) {
  return error?.canceled === true || axios.isCancel(error) || error?.name === 'AbortError'
}

// Seconds, matching Retry-After. HTTP-date is also permitted by HTTP.
export function parseRetryAfter(value, now = Date.now()) {
  if (value == null || String(value).trim() === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, (timestamp - now) / 1000) : null
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) return error
  if (isCanceledError(error) || error?.code === 'ERR_CANCELED') return canceledError()
  const response = error?.response
  const body = response?.data?.error
  const headers = axios.AxiosHeaders.from(response?.headers)
  // Do not retain Axios config/cause/request: they can contain bearer or BYOK secrets.
  return new ApiError(
    typeof body?.message === 'string' ? body.message : 'The request could not be completed.',
    {
      status: response?.status ?? null,
      code:
        typeof body?.code === 'string'
          ? body.code
          : response
            ? 'HTTP_ERROR'
            : ['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)
              ? 'REQUEST_TIMEOUT'
              : 'NETWORK_ERROR',
      request_id: body?.request_id ?? headers.get('x-request-id') ?? null,
      details: body?.details ?? [],
      retryAfter: parseRetryAfter(headers.get('retry-after')),
    },
  )
}

function invalidRequest(message) {
  return new ApiError(message, { code: 'INVALID_REQUEST' })
}

function normalizeBaseURL(value) {
  if (typeof value !== 'string') throw invalidRequest('Invalid API base URL.')
  const base = (value || '/v1').replace(/\/+$/, '')
  if (base.startsWith('/') && !base.startsWith('//') && /^\/[a-zA-Z0-9/_-]*v1$/.test(base))
    return base
  try {
    const url = new URL(base)
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname.endsWith('/v1')
    )
      return base
  } catch {
    /* Invalid URL handled below, without including its value. */
  }
  throw invalidRequest('API base URL must be an HTTP(S) URL or a root-relative path ending in /v1.')
}

function checkApiPath(path) {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\\\s#]/.test(path)
  )
    throw invalidRequest('API requests require a relative resource path.')
  const pathname = path.split('?')[0]
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    throw invalidRequest('Invalid API path.')
  }
  const hasControlCharacter = [...decoded].some(
    (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
  )
  if (
    decoded.includes('\\') ||
    decoded.includes('//') ||
    decoded.split('/').some((part) => part === '.' || part === '..') ||
    hasControlCharacter
  )
    throw invalidRequest('Invalid API path.')
}

function removePrivateHeaders(config) {
  config.headers = axios.AxiosHeaders.from(config.headers)
  for (const name of ['Authorization', 'X-AI-Key', 'Idempotency-Key']) config.headers.delete(name)
  delete config.auth
  config.withCredentials = false
  return config
}

export function createApiClients({
  baseURL = env.VITE_API_BASE_URL || '/v1',
  authStore = useAuthStore,
  adapter,
  uploadAdapter,
} = {}) {
  const base = normalizeBaseURL(baseURL)
  const rootBase = base.slice(0, -3) || '/'
  const api = axios.create({ baseURL: base, timeout: 15000, adapter, withCredentials: false })
  const healthApi = axios.create({
    baseURL: rootBase,
    timeout: 10000,
    adapter,
    withCredentials: false,
  })
  const uploadApi = axios.create({
    timeout: 60000,
    adapter: uploadAdapter ?? adapter,
    withCredentials: false,
    maxRedirects: 0,
  })

  api.getSessionVersion = () => authStore.getState().sessionVersion
  api.interceptors.request.use(
    (config) => {
      checkApiPath(config.url)
      if (config.baseURL !== base)
        throw invalidRequest('API base URL cannot be overridden per request.')
      const state = authStore.getState()
      if (
        config._authSessionVersion !== undefined &&
        config._authSessionVersion !== state.sessionVersion
      )
        throw canceledError()
      config._authSessionVersion = state.sessionVersion
      if (!state.accessToken)
        throw new ApiError('Sign in before using the live API.', {
          status: 401,
          code: 'AUTH_REQUIRED',
        })
      config.headers = axios.AxiosHeaders.from(config.headers)
      config.headers.delete('Authorization')
      delete config.auth
      config.withCredentials = false
      if (state.accessToken) config.headers.set('Authorization', `Bearer ${state.accessToken}`)
      return config
    },
    (error) => {
      throw normalizeApiError(error)
    },
    { synchronous: true },
  )
  api.interceptors.response.use(
    (response) => {
      if (response.config._authSessionVersion !== authStore.getState().sessionVersion)
        throw canceledError()
      return response.data
    },
    (error) => {
      const version = error?.config?._authSessionVersion
      if (version !== undefined && version !== authStore.getState().sessionVersion)
        throw canceledError()
      if (error?.response?.status === 401 && version !== undefined)
        authStore.getState().logoutIfCurrent(version)
      throw normalizeApiError(error)
    },
  )
  healthApi.interceptors.request.use((config) => {
    if (config.url !== '/health' || config.baseURL !== rootBase)
      throw invalidRequest('Health requests must use /health.')
    return removePrivateHeaders(config)
  })
  uploadApi.interceptors.request.use(removePrivateHeaders)
  for (const client of [healthApi, uploadApi]) {
    client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        throw normalizeApiError(error)
      },
    )
  }
  return { api, healthApi, uploadApi }
}

export const { api, healthApi, uploadApi } = createApiClients()

// Create once per user action and retain for that exact action's manual retries.
// The request layer never automatically retries a POST.
export function createIdempotencyKey() {
  if (!globalThis.crypto?.randomUUID)
    throw invalidRequest('Secure random UUID support is required.')
  return globalThis.crypto.randomUUID()
}

export function requestOptions({ signal, idempotencyKey, providerApiKey } = {}) {
  const headers = {}
  if (idempotencyKey !== undefined) {
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 128 ||
      /[\r\n]/.test(idempotencyKey)
    )
      throw invalidRequest('An idempotency key of 16 to 128 characters is required.')
    headers['Idempotency-Key'] = idempotencyKey
  }
  if (providerApiKey !== undefined) {
    if (
      typeof providerApiKey !== 'string' ||
      !providerApiKey.trim() ||
      /[\r\n]/.test(providerApiKey)
    )
      throw invalidRequest('A provider API key is required for this request.')
    headers['X-AI-Key'] = providerApiKey
  }
  return { signal, headers, _authSessionVersion: captureSession() }
}

export function mutationOptions(options = {}, { requiresProviderKey = false } = {}) {
  if (!options.idempotencyKey)
    throw invalidRequest('Retain an idempotency key before starting this action.')
  if (requiresProviderKey && !options.providerApiKey)
    throw invalidRequest('Supply the provider API key for this action.')
  return requestOptions(options)
}

export function resourceId(value) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    throw invalidRequest('A resource UUID is required.')
  return value
}

export const USE_MOCK = env.VITE_USE_MOCK === 'true'
export const unwrap = (body) => body?.data
export const unwrapList = (body) => ({
  items: body?.data ?? [],
  nextCursor: body?.next_cursor ?? null,
})
export const mockResponse = (data, ms = 300) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms))
export const captureSession = () => useAuthStore.getState().sessionVersion
export function assertSession(version, signal) {
  if (signal?.aborted || version !== captureSession()) throw canceledError()
}
