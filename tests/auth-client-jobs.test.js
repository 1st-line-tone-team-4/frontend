import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createApiClients,
  createIdempotencyKey,
  mutationOptions,
  normalizeApiError,
  captureSession,
  assertSession,
} from '../src/api/client.js'
import { createAuthStore, useAuthStore } from '../src/stores/useAuthStore.js'
import { useAiStore } from '../src/stores/useAiStore.js'
import { waitForJob, sleep, retryJob, restartJob } from '../src/api/jobs.js'

const response = (config, data = { data: { id: 'ok' } }) => ({
  config,
  data,
  status: 200,
  headers: {},
})
test('auth state is memory only, invalid tokens rejected and sessions increment', () => {
  const store = createAuthStore()
  assert.throws(() => store.getState().setToken('a b'))
  store.getState().setToken('first')
  assert.equal(store.getState().sessionVersion, 1)
  store.getState().logout()
  assert.equal(store.getState().accessToken, null)
  assert.equal(store.getState().logoutIfCurrent(1), false)
})
test('old success and old 401 cannot cross a token change', async () => {
  for (const fail of [false, true]) {
    const store = createAuthStore()
    store.getState().setToken('first')
    let complete
    const { api } = createApiClients({
      authStore: store,
      adapter: (config) =>
        new Promise((resolve, reject) => {
          complete = () =>
            fail ? reject({ config, response: { status: 401 } }) : resolve(response(config))
        }),
    })
    const request = api.get('/me')
    store.getState().setToken('second')
    complete()
    await assert.rejects(request, (e) => e.code === 'CANCELED')
    assert.equal(store.getState().accessToken, 'second')
  }
})
test('current 401 expires session and safe errors retain correlation/backoff', async () => {
  const store = createAuthStore()
  store.getState().setToken('first')
  const { api } = createApiClients({
    authStore: store,
    adapter: async (config) => {
      throw {
        config,
        response: { status: 401, data: { error: { code: 'UNAUTHORIZED', request_id: 'r' } } },
      }
    },
  })
  await assert.rejects(api.get('/me'), (e) => e.request_id === 'r')
  assert.equal(store.getState().accessToken, null)
  const error = normalizeApiError({
    config: { secret: 'never-copy' },
    response: {
      status: 429,
      headers: { 'retry-after': '3' },
      data: { error: { code: 'RATE_LIMITED', request_id: 'r' } },
    },
  })
  assert.equal(error.retryAfter, 3)
  assert.equal(error.request_id, 'r')
  assert.equal(error.config, undefined)
})
test('mutation requires retained idempotency key; no implicit retry key', () => {
  assert.throws(() => mutationOptions({}))
  const key = createIdempotencyKey()
  assert.equal(mutationOptions({ idempotencyKey: key }).headers['Idempotency-Key'], key)
  assert.equal(mutationOptions({ idempotencyKey: key }).headers['Idempotency-Key'], key)
})
test('private headers never reach signed upload client', async () => {
  let sent
  const { uploadApi } = createApiClients({
    uploadAdapter: async (config) => {
      sent = config
      return response(config)
    },
  })
  await uploadApi.put('https://storage.example/file', 'bytes', {
    headers: { Authorization: 'Bearer secret', 'X-AI-Key': 'secret', 'Idempotency-Key': 'secret' },
  })
  assert.equal(sent.headers.get('Authorization'), undefined)
  assert.equal(sent.headers.get('X-AI-Key'), undefined)
})
test('auth teardown clears BYOK and session guard rejects old operation', () => {
  useAuthStore.getState().setToken('first')
  const version = captureSession()
  useAiStore.getState().setKey('synthetic-key')
  useAuthStore.getState().logout()
  assert.equal(useAiStore.getState().providerApiKey, '')
  assert.throws(
    () => assertSession(version),
    (e) => e.code === 'CANCELED',
  )
})
test('job polling floors interval and honors throttle without retrying mutation', async () => {
  let clock = 0
  let calls = 0
  const waits = []
  const job = await waitForJob(
    { id: 'job', status: 'queued', model_id: 'original' },
    {
      interval: 10,
      now: () => clock,
      delay: async (ms) => {
        waits.push(ms)
        clock += ms
      },
      poll: async () => {
        if (++calls === 1) throw { status: 429, retryAfter: 4 }
        return { id: 'job', status: 'succeeded' }
      },
    },
  )
  assert.deepEqual(waits, [2000, 4000])
  assert.equal(job.model_id, 'original')
})
test('terminal outcomes and observation timeout are distinct', async () => {
  for (const [status, code] of [
    ['failed', 'JOB_FAILED'],
    ['outcome_unknown', 'JOB_OUTCOME_UNKNOWN'],
    ['canceled', 'JOB_CANCELED'],
  ]) {
    await assert.rejects(
      waitForJob({ id: 'job', status }),
      (e) => e.code === code && e.job.status === status,
    )
  }
  await assert.rejects(
    waitForJob({ id: 'job', status: 'queued' }, { timeout: 1000 }),
    (e) => e.code === 'JOB_OBSERVATION_TIMEOUT',
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(sleep(2000, controller.signal), (e) => e.code === 'CANCELED')
})
test('recovery never guesses model or duplicate-cost consent', () => {
  assert.throws(
    () => retryJob('job'),
    (e) => e.code === 'ORIGINAL_MODEL_REQUIRED',
  )
  assert.throws(
    () => restartJob('job', {}, { modelId: 'original' }),
    (e) => e.code === 'COST_ACKNOWLEDGEMENT_REQUIRED',
  )
})
test('an invocation captured before identity change is rejected before dispatch', async () => {
  useAuthStore.getState().setToken('first')
  const version = captureSession()
  useAuthStore.getState().setToken('second')
  let sent = false
  const { api } = createApiClients({
    adapter: async (config) => {
      sent = true
      return response(config)
    },
  })
  await assert.rejects(
    api.get('/me', { _authSessionVersion: version }),
    (e) => e.code === 'CANCELED',
  )
  assert.equal(sent, false)
})
test('identity transition cancels and removes private cached data', async () => {
  const { queryClient } = await import('../src/api/queryClient.js')
  queryClient.setQueryData(['me'], { display_name: 'Previous user' })
  useAuthStore.getState().logout()
  assert.equal(queryClient.getQueryData(['me']), undefined)
})
test('unauthenticated request is rejected before transport', async () => {
  const store = createAuthStore()
  let sent = false
  const { api } = createApiClients({
    authStore: store,
    adapter: async (config) => {
      sent = true
      return response(config)
    },
  })
  await assert.rejects(api.get('/me'), (e) => e.code === 'AUTH_REQUIRED')
  assert.equal(sent, false)
})
