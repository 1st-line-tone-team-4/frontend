import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api/client.js'
import * as Study from '../src/api/study.js'
import { retryJob, restartJob } from '../src/api/jobs.js'
import { useAuthStore } from '../src/stores/useAuthStore.js'
import { useAiStore } from '../src/stores/useAiStore.js'

const id = '00000000-0000-4000-8000-000000000001'
const options = { idempotencyKey: 'synthetic-operation-key-0001', modelId: 'test:original' }
const requests = []
api.defaults.adapter = async (config) => {
  requests.push({
    path: config.url,
    method: config.method,
    headers: config.headers,
    body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
  })
  return { status: 202, config, headers: {}, data: { data: { job: { id, status: 'queued' } } } }
}

function setup() {
  requests.length = 0
  useAuthStore.getState().setToken('synthetic-contract-token')
  useAiStore.getState().setModel('test:currently-selected')
  useAiStore.getState().setKey('synthetic-contract-key')
}

test('all AI mutation wrappers include original model, BYOK and retained operation key', async () => {
  setup()
  const calls = [
    () => Study.completeMaterialUpload(id, options),
    () =>
      Study.createQuestionSet(
        { unit_id: id, concept_version_ids: [id], count: 1, difficulty: 'medium' },
        options,
      ),
    () =>
      Study.submitAttempt(
        id,
        { question_set_id: id, answer: { type: 'short_answer', text: 'test' } },
        options,
      ),
    () =>
      Study.createLearningExplanation(
        { concept_version_id: id, explanation_language: 'ko' },
        options,
      ),
    () => Study.sendTeachbackMessage(id, 'test transcript', 'voice_transcript', options),
    () => Study.completeTeachbackSession(id, options),
    () => retryJob(id, options),
    () => restartJob(id, { acknowledge_possible_duplicate_cost: true }, options),
    () => Study.validateAiKey(options),
  ]
  for (const call of calls) {
    const result = await call()
    const sent = requests.at(-1)
    assert.equal(sent.method, 'post')
    assert.equal(sent.body.model_id, 'test:original')
    assert.equal(sent.headers.get('X-AI-Key'), 'synthetic-contract-key')
    assert.equal(sent.headers.get('Idempotency-Key'), options.idempotencyKey)
    assert.equal(result.job.model_id, 'test:original')
  }
})

test('voice input maps to voice_transcript and final-answer never transmits BYOK', async () => {
  setup()
  await Study.sendTeachbackMessage(id, 'synthetic voice', 'voice', options)
  assert.equal(requests.at(-1).body.input_mode, 'voice_transcript')
  await Study.submitFinalTeachbackAnswer(id, 'synthetic final answer', 'voice', options)
  const final = requests.at(-1)
  assert.equal(final.body.input_mode, 'voice_transcript')
  assert.equal(final.body.model_id, undefined)
  assert.equal(final.headers.get('X-AI-Key'), undefined)
  assert.equal(final.headers.get('Idempotency-Key'), options.idempotencyKey)
})

test('ordinary mutations do not inherit the stored provider key', async () => {
  setup()
  await Study.createExamGoal(
    { title: 'Synthetic', exam_type: 'other', exam_date: '2030-01-01' },
    options,
  )
  assert.equal(requests.at(-1).headers.get('X-AI-Key'), undefined)
  assert.equal(requests.at(-1).body.model_id, undefined)
  await Study.updatePlanTask(id, { status: 'completed' })
  assert.equal(requests.at(-1).method, 'patch')
  assert.equal(requests.at(-1).headers.get('X-AI-Key'), undefined)
})

test('missing operation key and wrong resource identity fail before dispatch', () => {
  setup()
  assert.throws(() => Study.createQuestionSet({ count: 1 }), /idempotency key/i)
  assert.throws(() => Study.completeMaterialUpload('../different-resource', options), /UUID/)
  assert.equal(requests.length, 0)
})
