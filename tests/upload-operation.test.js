import test from 'node:test'
import assert from 'node:assert/strict'
import {
  newUploadOperation,
  runUploadOperation,
  validateUploadFile,
} from '../src/utils/uploadOperation.js'

const file = { name: 'source.txt', type: 'text/plain', size: 5 }
const material = { id: 'material-1', processing_status: 'upload_pending', latest_job_id: null }
function setup() {
  let sequence = 0
  const op = newUploadOperation(file, 'test:grounded', () => `operation-key-${++sequence}`)
  const calls = []
  const api = {
    createMaterialUpload: async (_, opts) => {
      calls.push(['create', opts])
      return {
        material,
        upload_url: 'http://local/upload',
        expires_at: new Date(Date.now() + 600000).toISOString(),
      }
    },
    putFileToSignedUrl: async (_, __, opts) => {
      calls.push(['put', opts])
    },
    completeMaterialUpload: async (_, opts) => {
      calls.push(['complete', opts])
      return { job: { id: 'job-1', status: 'queued' } }
    },
    getMaterial: async () => {
      calls.push(['get'])
      return material
    },
  }
  return { op, calls, api }
}
test('validates file size and actual MIME before an operation exists', () => {
  assert.throws(() => validateUploadFile({ ...file, type: '' }))
  assert.throws(() => validateUploadFile({ ...file, size: 0 }))
  assert.throws(() => validateUploadFile({ ...file, size: 20971521 }))
  assert.throws(() => newUploadOperation(file, '', () => 'key'))
})
test('happy path retains material, job and original model, with separate stable POST keys', async () => {
  const { op, calls, api } = setup()
  await runUploadOperation(op, api)
  assert.equal(op.stage, 'accepted')
  assert.equal(op.material.id, material.id)
  assert.equal(op.job.model_id, 'test:grounded')
  assert.deepEqual(
    calls.map(([name]) => name),
    ['create', 'put', 'complete'],
  )
  assert.equal(calls[0][1].idempotencyKey, op.createKey)
  assert.equal(calls[2][1].idempotencyKey, op.completeKey)
  await runUploadOperation(op, api)
  assert.equal(calls.length, 3)
})
test('lost create response repeats same create key, not a new operation', async () => {
  const { op, calls, api } = setup()
  const original = api.createMaterialUpload
  let first = true
  api.createMaterialUpload = async (...args) => {
    const r = await original(...args)
    if (first) {
      first = false
      throw new Error('lost response')
    }
    return r
  }
  await assert.rejects(runUploadOperation(op, api))
  await runUploadOperation(op, api)
  assert.equal(calls[0][1].idempotencyKey, calls[1][1].idempotencyKey)
})
test('lost PUT response probes complete instead of overwriting immutable bytes', async () => {
  const { op, calls, api } = setup()
  api.putFileToSignedUrl = async () => {
    calls.push(['put'])
    throw new Error('lost put response')
  }
  await assert.rejects(runUploadOperation(op, api))
  assert.equal(op.stage, 'put_unknown')
  await runUploadOperation(op, api)
  assert.deepEqual(
    calls.map(([name]) => name),
    ['create', 'put', 'get', 'complete'],
  )
})
test('lost complete response reconciles latest_job_id without another paid request', async () => {
  const { op, calls, api } = setup()
  api.completeMaterialUpload = async () => {
    calls.push(['complete'])
    throw new Error('lost response')
  }
  await assert.rejects(runUploadOperation(op, api))
  api.getMaterial = async () => ({
    ...material,
    latest_job_id: 'job-1',
    processing_status: 'queued',
  })
  await runUploadOperation(op, api)
  assert.equal(op.stage, 'accepted')
  assert.equal(calls.filter(([name]) => name === 'complete').length, 1)
})
test('unknown complete replays same complete key when material still pending', async () => {
  const { op, calls, api } = setup()
  const original = api.completeMaterialUpload
  let first = true
  api.completeMaterialUpload = async (...args) => {
    const result = await original(...args)
    if (first) {
      first = false
      throw new Error('lost')
    }
    return result
  }
  await assert.rejects(runUploadOperation(op, api))
  await runUploadOperation(op, api)
  const complete = calls.filter(([name]) => name === 'complete')
  assert.equal(complete[0][1].idempotencyKey, complete[1][1].idempotencyKey)
  assert.equal(calls.filter(([name]) => name === 'put').length, 1)
})
test('only UPLOAD_MISSING permits a second PUT after uncertainty', async () => {
  const { op, calls, api } = setup()
  op.material = material
  op.uploadUrl = 'http://local/upload'
  op.stage = 'put_unknown'
  const original = api.completeMaterialUpload
  let first = true
  api.completeMaterialUpload = async (...args) => {
    if (first) {
      first = false
      calls.push(['missing'])
      throw { code: 'UPLOAD_MISSING' }
    }
    return original(...args)
  }
  await runUploadOperation(op, api)
  assert.deepEqual(
    calls.map(([name]) => name),
    ['get', 'missing', 'put', 'complete'],
  )
})
test('local cancellation and stale session fence prevent subsequent work', async () => {
  const { op, calls, api } = setup()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(runUploadOperation(op, api, { signal: controller.signal }))
  assert.equal(calls.length, 0)
  await assert.rejects(
    runUploadOperation(op, api, {
      check: () => {
        throw new Error('stale session')
      },
    }),
  )
  assert.equal(calls.length, 0)
})
test('expired upload URL is not silently replaced with a new material', async () => {
  const { op, calls, api } = setup()
  op.material = material
  op.stage = 'put'
  op.expiresAt = '2020-01-01T00:00:00Z'
  await assert.rejects(runUploadOperation(op, api), { code: 'UPLOAD_EXPIRED' })
  assert.equal(calls.length, 0)
})
