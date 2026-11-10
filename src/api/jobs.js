import {
  api,
  unwrap,
  requestOptions,
  resourceId,
  ApiError,
  captureSession,
  assertSession,
  canceledError,
} from './client.js'
import { post } from './study.js'

export const getJob = (id, options = {}) =>
  api.get(`/jobs/${resourceId(id)}`, requestOptions(options)).then(unwrap)
function requireOriginalModel(options) {
  if (!options.modelId)
    throw new ApiError('The original job model is required for recovery.', {
      code: 'ORIGINAL_MODEL_REQUIRED',
    })
}
export const retryJob = (id, options = {}) => {
  requireOriginalModel(options)
  return post(`/jobs/${resourceId(id)}/retry`, {}, options, true)
}
export const restartJob = (id, body, options = {}) => {
  requireOriginalModel(options)
  if (body?.acknowledge_possible_duplicate_cost !== true)
    throw new ApiError('Confirm possible duplicate cost before restarting.', {
      code: 'COST_ACKNOWLEDGEMENT_REQUIRED',
    })
  return post(`/jobs/${resourceId(id)}/restart`, body, options, true)
}
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(canceledError())
    const abort = () => {
      clearTimeout(timer)
      reject(canceledError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })
}
function jobError(code, message, job) {
  return Object.assign(new ApiError(message, { code }), { job })
}
// Only reads are repeated. Timeout/cancel stops observation, never cancels the server job.
export async function waitForJob(
  job,
  { signal, interval = 2000, timeout = 180_000, poll = getJob, delay = sleep, now = Date.now } = {},
) {
  const version = captureSession()
  const started = now()
  let current = job
  let wait = Math.max(2000, interval)
  while (['queued', 'running'].includes(current.status)) {
    assertSession(version, signal)
    const remaining = timeout - (now() - started)
    if (remaining <= 0 || wait > remaining)
      throw jobError(
        'JOB_OBSERVATION_TIMEOUT',
        'Observation timed out. Check this job again before retrying work.',
        current,
      )
    await delay(wait, signal)
    assertSession(version, signal)
    if (now() - started >= timeout)
      throw jobError('JOB_OBSERVATION_TIMEOUT', 'Observation timed out.', current)
    try {
      const next = await poll(current.id, { signal })
      assertSession(version, signal)
      current = { ...next, ...(job.model_id ? { model_id: job.model_id } : {}) }
      wait = Math.max(2000, interval)
    } catch (error) {
      assertSession(version, signal)
      if (error.status !== 429) throw error
      wait = Math.max(2000, (error.retryAfter ?? 2) * 1000, interval)
    }
  }
  assertSession(version, signal)
  if (current.status === 'succeeded') return current
  const codes = {
    failed: 'JOB_FAILED',
    outcome_unknown: 'JOB_OUTCOME_UNKNOWN',
    canceled: 'JOB_CANCELED',
  }
  throw jobError(
    codes[current.status] ?? 'JOB_INVALID_STATE',
    current.status === 'outcome_unknown'
      ? 'Provider outcome is unknown. Do not repeat automatically.'
      : 'The job did not succeed.',
    current,
  )
}
