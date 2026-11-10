import test from 'node:test'
import assert from 'node:assert/strict'
import {
  uniqueTaskConcepts,
  resolveContext,
  studyUrl,
  quizResults,
  nextQuestionIndex,
  canSendTeachback,
  canRetryJob,
  canRestartJob,
  isDefinitiveRejection,
  recoveryDecision,
} from '../src/utils/studyModel.js'

const concept = { concept_id: 'c', concept_version_id: 'v', material_id: 'm', unit_id: 'u' }
const task = { id: 't', concepts: [concept], concept_version_ids: ['v'] }
test('task material outranks stale global upload and deduplicates pinned versions', () => {
  const context = resolveContext({
    params: new URLSearchParams('task=t'),
    tasks: [task],
    savedMaterialId: 'stale',
  })
  assert.equal(context.materialId, 'm')
  assert.equal(context.unitId, 'u')
  assert.equal(context.task.id, 't')
  assert.equal(uniqueTaskConcepts([task, task]).length, 1)
})
test('URL identities survive reload and optional values are omitted', () => {
  assert.equal(studyUrl('/quiz/solve', { set: 'set1', task: null }), '/quiz/solve?set=set1')
  assert.equal(
    resolveContext({ params: new URLSearchParams('material=m2&unit=u2'), materialIds: ['m'] })
      .materialId,
    'm2',
  )
})
const question = {
  id: 'q',
  prompt: 'Real prompt',
  difficulty: 'medium',
  options: [{ id: 'a', text: 'A' }],
  concept_version_ids: ['v'],
  evidence: [],
}
test('real result does not replace missing or pending grades with canned marks', () => {
  assert.deepEqual(quizResults(null), [])
  const results = quizResults({
    items: [
      { ordinal: 1, question },
      { ordinal: 2, question, latest_attempt: { status: 'grading' } },
    ],
  })
  assert.equal(results.length, 2)
  assert.equal(results[0].isCorrect, null)
  assert.equal(results[1].isCorrect, null)
  assert.equal(results[0].sentence, 'Real prompt')
})
test('result keeps actual answer, source and grade', () => {
  const [row] = quizResults({
    items: [
      {
        ordinal: 1,
        question,
        latest_attempt: {
          id: 'attempt',
          status: 'graded',
          answer: { type: 'multiple_choice', selected_option_ids: ['a'] },
          result: {
            is_correct: true,
            correct_answer: { selected_option_ids: ['a'] },
            explanation: 'Actual explanation',
            evidence: [{ chunk_id: 'chunk' }],
          },
        },
      },
    ],
  })
  assert.equal(row.isCorrect, true)
  assert.equal(row.pickedId, 'a')
  assert.equal(row.attemptId, 'attempt')
  assert.equal(row.evidence[0].chunk_id, 'chunk')
})
test('resume uses backend next ordinal and treats failed attempt as unfinished', () => {
  const items = [
    { ordinal: 1, question, latest_attempt: { status: 'graded' } },
    { ordinal: 2, question, latest_attempt: { status: 'failed' } },
  ]
  assert.equal(nextQuestionIndex({ items, next_ordinal: 2 }), 1)
  assert.equal(nextQuestionIndex({ items }), 1)
})
test('third final answer disables subsequent sends', () => {
  const session = { status: 'active', question_count: 3 }
  assert.equal(canSendTeachback(session, [{ sequence_no: 1, role: 'assistant' }]), true)
  assert.equal(
    canSendTeachback(session, [
      { sequence_no: 2, role: 'user' },
      { sequence_no: 1, role: 'assistant' },
    ]),
    false,
  )
  assert.equal(canSendTeachback({ status: 'completed' }, []), false)
})
test('retry/restart strictly follows server status and attempts', () => {
  assert.equal(canRetryJob({ status: 'failed', retryable: true, attempt_no: 2 }), true)
  assert.equal(canRetryJob({ status: 'failed', retryable: true, attempt_no: 3 }), false)
  assert.equal(canRestartJob({ status: 'failed', retryable: false }), true)
  assert.equal(canRestartJob({ status: 'failed', retryable: true, attempt_no: 3 }), true)
  assert.equal(canRestartJob({ status: 'outcome_unknown' }), true)
  assert.equal(canRestartJob({ status: 'running' }), false)
})
test('ambiguous responses retain original request while validation can be corrected', () => {
  for (const status of [408, 409, 429, 500]) assert.equal(isDefinitiveRejection({ status }), false)
  assert.equal(isDefinitiveRejection({ status: 409, code: 'REQUEST_IN_PROGRESS' }), false)
  assert.equal(isDefinitiveRejection({ status: 422 }), true)
  assert.equal(isDefinitiveRejection({ code: 'MODEL_REQUIRED' }), true)
})
test('lost retry response observes progressed job and requires original model for a new call', () => {
  assert.equal(recoveryDecision({ status: 'running' }, { modelId: 'original' }), 'observe')
  assert.equal(recoveryDecision({ status: 'succeeded' }), 'observe')
  assert.equal(
    recoveryDecision({ status: 'outcome_unknown' }, { restart: true, acknowledge: true }),
    'missing-model',
  )
  assert.equal(
    recoveryDecision({ status: 'outcome_unknown' }, { restart: true, modelId: 'original' }),
    'blocked',
  )
  assert.equal(
    recoveryDecision(
      { status: 'outcome_unknown' },
      { restart: true, acknowledge: true, modelId: 'original' },
    ),
    'restart',
  )
})

test('task quiz count honors remaining targets while free practice allows twenty', async () => {
  const { questionCountLimit } = await import('../src/utils/studyModel.js')
  assert.equal(questionCountLimit({ target_count: 5, completed_count: 0 }), 5)
  assert.equal(questionCountLimit({ target_count: 5, completed_count: 3 }), 2)
  assert.equal(questionCountLimit({ target_count: 5, completed_count: 5 }), 0)
  assert.equal(questionCountLimit({ target_count: 5, completed_count: 6 }), 0)
  assert.equal(questionCountLimit(null), 20)
})

test('teach-back uses matching teach task, never the source solve task', async () => {
  const { selectTeachTask } = await import('../src/utils/studyModel.js')
  const tasks = [
    { id: 'solve', task_type: 'solve', status: 'pending', concept_version_ids: ['v'] },
    {
      id: 'teach-other',
      task_type: 'teach_back',
      status: 'pending',
      concept_version_ids: ['other'],
    },
    { id: 'teach', task_type: 'teach_back', status: 'pending', concept_version_ids: ['v'] },
  ]
  assert.equal(selectTeachTask(tasks, 'solve', 'v').id, 'teach')
  assert.equal(selectTeachTask(tasks, 'teach', 'v').id, 'teach')
  assert.equal(selectTeachTask(tasks, null, 'missing'), undefined)
})

test('quiz cold mount has no selection or set and never dereferences null', async () => {
  const { selectedQuestionIndex } = await import('../src/utils/studyModel.js')
  assert.equal(selectedQuestionIndex(undefined, null), 0)
  assert.equal(selectedQuestionIndex({ id: 'set', items: [] }, null), 0)
  assert.equal(selectedQuestionIndex({ id: 'set', items: [] }, { setId: 'set', index: 3 }), 3)
  assert.equal(selectedQuestionIndex({ id: 'new', items: [] }, { setId: 'old', index: 3 }), 0)
})

test('query-only navigation fences an old completion and requires explicit resume', async () => {
  const { createNavigationFence } = await import('../src/utils/studyModel.js')
  const fence = createNavigationFence('session1:keyA:/quiz?task=A')
  const oldScope = 'session1:keyA:/quiz?task=A'
  const originalOperation = { key: 'retained-idempotency-key', input: { task: 'A' }, blocked: true }
  let resolve
  const pending = new Promise((done) => {
    resolve = done
  })
  let navigations = 0
  const observation = pending.then(() => {
    if (fence.isCurrent(oldScope)) navigations++
  })
  fence.leave()
  fence.enter('session1:keyB:/quiz?task=B')
  resolve()
  await observation
  assert.equal(navigations, 0)
  assert.equal(originalOperation.blocked, true)
  assert.equal(originalOperation.key, 'retained-idempotency-key')
  assert.equal(fence.isCurrent(oldScope), false)
  assert.equal(fence.isCurrent('session1:keyB:/quiz?task=B'), true)
  fence.leave()
  fence.enter('session2:keyC:/quiz?task=A')
  assert.equal(fence.isCurrent(oldScope), false)
})

test('Back to a reused history key does not revive an earlier successful observation', async () => {
  const { createNavigationFence } = await import('../src/utils/studyModel.js')
  const firstVisit = { key: 'A', pathname: '/quiz', search: '?task=A' }
  const fence = createNavigationFence(firstVisit)
  fence.enter({ key: 'B', pathname: '/quiz', search: '?task=B' })
  const backVisit = { key: 'A', pathname: '/quiz', search: '?task=A' }
  fence.enter(backVisit)
  assert.equal(fence.isCurrent(firstVisit), false)
  assert.equal(fence.isCurrent(backVisit), true)
})

test('report cold mount and action changes do not dereference missing optimistic state', async () => {
  const { improvementChecked } = await import('../src/utils/studyModel.js')
  assert.equal(improvementChecked(null, undefined, undefined), false)
  assert.equal(improvementChecked(null, 'action', 'completed'), true)
  assert.equal(improvementChecked({ id: 'old', value: true }, 'action', 'pending'), false)
  assert.equal(improvementChecked({ id: 'action', value: false }, 'action', 'completed'), false)
})

test('explicit plan URL overrides another saved goal and preserves the exact revision', async () => {
  const { planMatchesSelection } = await import('../src/utils/studyModel.js')
  const plan = { id: 'older-plan', exam_goal_id: 'older-goal', status: 'active' }
  assert.equal(planMatchesSelection(plan, 'older-plan', 'newer-goal'), true)
  assert.equal(planMatchesSelection(plan, null, 'newer-goal'), false)
  assert.equal(planMatchesSelection(plan, null, 'older-goal'), true)
  assert.equal(
    planMatchesSelection({ ...plan, status: 'superseded' }, 'older-plan', 'newer-goal'),
    true,
  )
  assert.equal(planMatchesSelection({ ...plan, status: 'superseded' }, null, 'older-goal'), false)
  assert.equal(planMatchesSelection(plan, 'different-plan', 'older-goal'), false)
})

test('cached concepts cannot strip explicit task and plan while the plan loads', async () => {
  const { learningLinkContext, requiredLearningContext } =
    await import('../src/utils/studyModel.js')
  const params = new URLSearchParams('plan=original-plan&task=original-task&material=material')
  const pending = requiredLearningContext(params, { pending: true })
  assert.equal(pending.pending, true)
  assert.equal(pending.invalidTask, false)
  const base = learningLinkContext(params, { materialId: 'material', unitId: 'unit' })
  const link = studyUrl('/learn', { ...base, concept: 'cached-version' })
  const next = new URL(link, 'https://fixture.invalid')
  assert.equal(next.searchParams.get('plan'), 'original-plan')
  assert.equal(next.searchParams.get('task'), 'original-task')
  const quiz = new URL(
    studyUrl(
      '/quiz',
      learningLinkContext(next.searchParams, { materialId: 'material', unitId: 'unit' }),
    ),
    'https://fixture.invalid',
  )
  assert.equal(quiz.searchParams.get('plan'), 'original-plan')
  assert.equal(quiz.searchParams.get('task'), 'original-task')
  assert.equal(
    requiredLearningContext(params, { plan: { tasks: [{ id: 'original-task' }] } }).invalidTask,
    false,
  )
  assert.equal(
    requiredLearningContext(params, { plan: { tasks: [{ id: 'other-task' }] } }).invalidTask,
    true,
  )
})
