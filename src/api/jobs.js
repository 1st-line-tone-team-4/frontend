import { api, unwrap } from './client'

// 비동기 작업(AI 분석·생성·채점·리포트) 상태
// config: axios 옵션 (예: { signal } 로 요청 취소)
export const getJob = (jobId, config) => api.get(`/jobs/${jobId}`, config).then(unwrap)
// 같은 모델로만 재시도 가능 (model_id 필수)
export const retryJob = (jobId, modelId, config) =>
  api.post(`/jobs/${jobId}/retry`, { model_id: modelId }, config).then(unwrap)

// 재시도 불가 실패(또는 3회 소진) · outcome_unknown 복구 → 새 job (중복 실행 가능성에 동의 필요)
export const restartJob = (jobId, modelId, config) =>
  api
    .post(
      `/jobs/${jobId}/restart`,
      { model_id: modelId, acknowledge_possible_duplicate_execution: true },
      config,
    )
    .then(unwrap)

// failed + retryable + attempt_no < 3 이면 retry, 그 외 failed · outcome_unknown 은 restart
export const canRetryJob = (job) =>
  job?.status === 'failed' && job.retryable === true && (job.attempt_no ?? 1) < 3
export const canRestartJob = (job) =>
  job?.status === 'outcome_unknown' || (job?.status === 'failed' && !canRetryJob(job))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 서버 제한: 같은 job 은 2초에 한 번까지만 조회할 수 있어요 (어기면 429)
// 타이머 오차로 2초보다 살짝 빨리 보내지 않도록 여유를 둬요
const POLL_MIN_MS = 2500
const POLL_MAX_MS = 5000
const MAX_TRANSIENT_ERRORS = 3

// Retry-After: 초 단위 숫자 또는 HTTP 날짜 → ms
export function parseRetryAfter(value) {
  if (value === null || value === undefined || value === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now())
}

// 202 Accepted 로 받은 job 이 끝날 때까지 기다려요. 성공하면 job 을 반환, 실패하면 오류를 던져요
// 429 를 받으면 Retry-After 만큼 쉬었다가 다시 조회해요 (오류로 끝내지 않아요)
export async function waitForJob(job, { timeout = 180_000 } = {}) {
  const started = Date.now()
  let current = job
  let delay = POLL_MIN_MS
  let transientErrors = 0
  while (current.status === 'queued' || current.status === 'running') {
    if (Date.now() - started > timeout) {
      throw {
        code: 'JOB_TIMEOUT',
        message: '처리 시간이 오래 걸리고 있어요. 잠시 후 다시 확인해 주세요.',
      }
    }
    await sleep(delay)
    try {
      current = await getJob(current.id)
      transientErrors = 0
      delay = Math.min(delay + 500, POLL_MAX_MS)
    } catch (err) {
      if (err?.status === 429) {
        delay = Math.max(POLL_MIN_MS, (parseRetryAfter(err.retryAfter) ?? delay) + 200)
        continue
      }
      const transient = !err?.status || err.status >= 500
      if (transient && !err?.canceled && ++transientErrors <= MAX_TRANSIENT_ERRORS) {
        delay = Math.min(delay * 2, 15_000)
        continue
      }
      throw err
    }
  }
  if (current.status !== 'succeeded') {
    throw {
      code: current.error_code ?? 'JOB_FAILED',
      message: 'AI 처리에 실패했어요. 다시 시도해 주세요.',
      job: current,
    }
  }
  return current
}
