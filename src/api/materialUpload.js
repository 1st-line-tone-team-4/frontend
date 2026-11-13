import axios from 'axios'
import { api, unwrap, USE_MOCK, mockResponse, newIdempotencyKey } from './client'
import { getJob, retryJob } from './jobs'
import { getMaterial } from './study'
import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * 자료 여러 개 업로드용 API (파일 1개 기준 단계별 함수)
 * a. POST /materials            → { material, upload_url, expires_at }
 * b. PUT upload_url             (만료됐으면 a 부터 다시)
 * c. POST /materials/{id}/complete → 202 { job }
 * d. GET /jobs/{id} 폴링         (2초 이상 간격 · 429 면 Retry-After 준수)
 * 모든 함수는 signal 을 받아 AbortController 로 취소할 수 있어요
 */

const ACTIVE_JOB = ['queued', 'running']
const POLL_MIN_MS = 2000
const POLL_MAX_MS = 5000
const MAX_ISSUE_ATTEMPTS = 3 // 업로드 URL 만료 시 재발급 횟수
const MAX_TRANSIENT_ERRORS = 3 // 폴링 중 일시 오류(네트워크 · 5xx) 허용 횟수
const EXPIRY_MARGIN_MS = 5000

export const canceledError = () => ({
  canceled: true,
  code: 'CANCELED',
  message: '업로드를 취소했어요.',
})
export const isCanceled = (err) => Boolean(err?.canceled)

// signal 로 중간에 깨울 수 있는 대기
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(canceledError())
    const onAbort = () => {
      clearTimeout(timer)
      reject(canceledError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

// Retry-After: 초 단위 숫자 또는 HTTP 날짜 → ms
function parseRetryAfter(value) {
  if (value === null || value === undefined || value === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now())
}

const isExpired = (expiresAt) =>
  Boolean(expiresAt) && Date.now() >= new Date(expiresAt).getTime() - EXPIRY_MARGIN_MS

// 설정 → 환경 변수 순서로 분석 모델 · AI 키 사용
function aiConfig() {
  const { aiModelId, aiKey } = useSettingsStore.getState()
  return {
    modelId: aiModelId || import.meta.env.VITE_AI_MODEL_ID || undefined,
    aiKey: aiKey || import.meta.env.VITE_AI_KEY || undefined,
  }
}

// 202 Accepted 본문 → job
const toJob = (data) => data?.job ?? data

/* ── 목 모드: 백엔드 없이 업로드 흐름 확인 ─────────────── */
// 파일 이름에 'fail' 이 들어가면 첫 분석이 실패해요 (재시도 버튼 확인용)
const mockJobs = new Map()
const mock = {
  create: (file) =>
    mockResponse({
      material: { id: `mock-material-${newIdempotencyKey()}`, filename: file.name },
      upload_url: 'mock://upload',
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    }),
  put: () => mockResponse(null, 600 + Math.random() * 900),
  complete: (materialId, filename) => {
    const id = `mock-job-${materialId}`
    mockJobs.set(id, { startedAt: Date.now(), attempt: 1, fail: /fail/i.test(filename) })
    return mockResponse({ id, status: 'queued', attempt_no: 1 })
  },
  getJob: (jobId) => {
    const j = mockJobs.get(jobId)
    const done = Date.now() - j.startedAt > 3000
    const status = !done ? 'running' : j.fail ? 'failed' : 'succeeded'
    return mockResponse({
      id: jobId,
      status,
      attempt_no: j.attempt,
      retryable: status === 'failed',
      error_message: status === 'failed' ? '목 모드: 일부러 실패시킨 분석이에요.' : null,
    })
  },
  retry: (jobId) => {
    const j = mockJobs.get(jobId)
    mockJobs.set(jobId, { startedAt: Date.now(), attempt: j.attempt + 1, fail: false })
    return mockResponse({ id: jobId, status: 'queued', attempt_no: j.attempt + 1 })
  },
}

/* ── a · b · c 단계 ───────────────────────────── */
export const createMaterial = (file, mimeType, { idempotencyKey, signal }) =>
  USE_MOCK
    ? mock.create(file)
    : api
        .post(
          '/materials',
          { filename: file.name, mime_type: mimeType, size_bytes: file.size },
          { headers: { 'Idempotency-Key': idempotencyKey }, signal },
        )
        .then(unwrap)

// 서명 URL 은 우리 서버가 아니므로 토큰 없이 axios 기본 인스턴스로 보내요
export const putMaterialFile = (url, file, mimeType, { signal }) =>
  USE_MOCK ? mock.put() : axios.put(url, file, { headers: { 'Content-Type': mimeType }, signal })

export const completeMaterial = (material, { idempotencyKey, signal }) => {
  if (USE_MOCK) return mock.complete(material.id, material.filename)
  const { modelId, aiKey } = aiConfig()
  return api
    .post(
      `/materials/${material.id}/complete`,
      { model_id: modelId },
      {
        headers: { 'Idempotency-Key': idempotencyKey, ...(aiKey && { 'X-AI-Key': aiKey }) },
        signal,
      },
    )
    .then(unwrap)
    .then(toJob)
}

export const retryMaterialJob = (jobId, { signal }) =>
  USE_MOCK ? mock.retry(jobId) : retryJob(jobId, { signal }).then(toJob)

const fetchJob = (jobId, signal) => (USE_MOCK ? mock.getJob(jobId) : getJob(jobId, { signal }))

// 분석이 끝난 자료의 페이지 수 (텍스트 파일처럼 브라우저에서 셀 수 없을 때)
export async function fetchMaterialPageCount(materialId) {
  if (USE_MOCK) return null
  try {
    const material = await getMaterial(materialId)
    return material?.page_count ?? null
  } catch {
    return null
  }
}

/* ── 단계 묶음 ────────────────────────────────── */
// a + b · 업로드 URL 이 만료됐으면 새 Idempotency-Key 로 a 부터 다시
export async function uploadMaterialFile(file, mimeType, { signal, onMaterial } = {}) {
  for (let attempt = 1; attempt <= MAX_ISSUE_ATTEMPTS; attempt += 1) {
    const { material, upload_url, expires_at } = await createMaterial(file, mimeType, {
      idempotencyKey: newIdempotencyKey(),
      signal,
    })
    onMaterial?.(material)
    if (isExpired(expires_at)) continue

    try {
      await putMaterialFile(upload_url, file, mimeType, { signal })
      return material
    } catch (err) {
      if (axios.isCancel(err) || signal?.aborted) throw canceledError()
      if (isExpired(expires_at)) continue
      throw {
        code: 'UPLOAD_FAILED',
        message: '파일 전송에 실패했어요. 네트워크 상태를 확인해 주세요.',
      }
    }
  }
  throw { code: 'UPLOAD_URL_EXPIRED', message: '업로드 주소가 계속 만료돼요. 다시 올려 주세요.' }
}

// d · job 이 끝날 때까지 폴링 (succeeded / failed 상관없이 마지막 job 을 반환)
export async function pollJob(job, { signal, onUpdate } = {}) {
  let current = job
  let delay = POLL_MIN_MS
  let transientErrors = 0

  while (!current?.status || ACTIVE_JOB.includes(current.status)) {
    await sleep(delay, signal)
    try {
      current = await fetchJob(job.id, signal)
      onUpdate?.(current)
      transientErrors = 0
      delay = Math.min(delay + 500, POLL_MAX_MS)
    } catch (err) {
      if (isCanceled(err) || signal?.aborted) throw canceledError()
      if (err.status === 429) {
        delay = Math.max(POLL_MIN_MS, parseRetryAfter(err.retryAfter) ?? delay * 2)
        continue
      }
      const transient = !err.status || err.status >= 500
      if (transient && ++transientErrors <= MAX_TRANSIENT_ERRORS) {
        delay = Math.min(delay * 2, 15_000)
        continue
      }
      throw err
    }
  }
  return current
}
