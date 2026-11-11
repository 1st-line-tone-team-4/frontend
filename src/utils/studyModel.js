export function uniqueTaskConcepts(tasks = []) {
  return [
    ...new Map(
      tasks
        .flatMap((task) => task.concepts ?? [])
        .map((concept) => [concept.concept_version_id, concept]),
    ).values(),
  ]
}
export function resolveContext({ params, tasks = [], materialIds = [], savedMaterialId }) {
  const task = tasks.find((item) => item.id === params.get('task'))
  const concepts = uniqueTaskConcepts(task ? [task] : tasks)
  const requested = params.get('concept') || params.get('c')
  const concept = concepts.find(
    (item) => item.concept_version_id === requested || item.concept_id === requested,
  )
  return {
    task,
    concept,
    materialId:
      task?.concepts?.[0]?.material_id ||
      concept?.material_id ||
      params.get('material') ||
      materialIds[0] ||
      savedMaterialId ||
      null,
    unitId: concept?.unit_id || task?.concepts?.[0]?.unit_id || params.get('unit') || null,
  }
}
export function studyUrl(path, context = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(context)) if (value) params.set(key, value)
  return `${path}${params.size ? `?${params}` : ''}`
}
export function quizResults(set) {
  return (set?.items ?? [])
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((item) => {
      const { question: q, latest_attempt: attempt } = item
      const result = attempt?.status === 'graded' ? attempt.result : null
      return {
        ordinal: item.ordinal,
        questionId: q.id,
        attemptId: attempt?.id,
        conceptVersionId: q.concept_version_ids?.[0],
        concept: '출제 개념',
        level: { easy: '하', medium: '중', hard: '상' }[q.difficulty],
        sentence: q.prompt,
        choices: q.options ?? [],
        answerId: result?.correct_answer?.selected_option_ids?.[0],
        pickedId: attempt?.answer?.selected_option_ids?.[0],
        correctText: result?.correct_answer?.text,
        userText: attempt?.answer?.text,
        isCorrect: result?.is_correct ?? null,
        status: attempt?.status ?? 'unanswered',
        explanation: [result?.feedback, result?.explanation].filter(Boolean).join('\n'),
        evidence: result?.evidence ?? q.evidence ?? [],
      }
    })
}
export function nextQuestionIndex(set) {
  const items = (set?.items ?? []).slice().sort((a, b) => a.ordinal - b.ordinal)
  const byOrdinal = items.findIndex((item) => item.ordinal === set?.next_ordinal)
  return byOrdinal >= 0
    ? byOrdinal
    : Math.max(
        0,
        items.findIndex((item) => item.latest_attempt?.status !== 'graded'),
      )
}
export function canSendTeachback(session, messages = []) {
  if (session?.status !== 'active') return false
  const sorted = [...messages].sort((a, b) => a.sequence_no - b.sequence_no)
  return !(session.question_count >= 3 && sorted.at(-1)?.role === 'user')
}
export function canRetryJob(job) {
  return job?.status === 'failed' && job.retryable === true && (job.attempt_no ?? 1) < 3
}
export function canRestartJob(job) {
  return (
    job?.status === 'outcome_unknown' ||
    (job?.status === 'failed' && (!job.retryable || job.attempt_no >= 3))
  )
}
export function isDefinitiveRejection(error) {
  if (['REQUEST_IN_PROGRESS', 'IDEMPOTENCY_CONFLICT'].includes(error?.code)) return false
  if ([408, 409, 429].includes(error?.status)) return false
  return (
    (error?.status >= 400 && error.status < 500) ||
    ['MODEL_REQUIRED', 'INVALID_REQUEST'].includes(error?.code)
  )
}
export function recoveryDecision(current, { restart = false, acknowledge = false, modelId } = {}) {
  if (['queued', 'running', 'succeeded'].includes(current?.status)) return 'observe'
  if (!modelId) return 'missing-model'
  if (restart) return canRestartJob(current) && acknowledge ? 'restart' : 'blocked'
  return canRetryJob(current) ? 'retry' : 'blocked'
}
export function selectTeachTask(tasks = [], requestedId, versionId) {
  const requested = tasks.find((task) => task.id === requestedId)
  if (
    requested?.task_type === 'teach_back' &&
    (!versionId || requested.concept_version_ids.includes(versionId))
  )
    return requested
  const selectedVersion = versionId || requested?.concept_version_ids?.[0]
  return tasks.find(
    (task) =>
      task.task_type === 'teach_back' &&
      !['completed', 'skipped'].includes(task.status) &&
      task.concept_version_ids.includes(selectedVersion),
  )
}
export function questionCountLimit(task) {
  return task ? Math.max(0, Math.min(20, task.target_count - task.completed_count)) : 20
}
export function selectedQuestionIndex(set, selection) {
  return selection && set && selection.setId === set.id ? selection.index : nextQuestionIndex(set)
}
// One observation belongs to one router history entry and authenticated session.
export function createNavigationFence(initialScope) {
  let current = initialScope
  return {
    enter: (scope) => {
      current = scope
    },
    isCurrent: (scope) => scope === current,
    leave: () => {
      current = null
    },
  }
}
export function improvementChecked(override, actionId, savedStatus) {
  return override && actionId && override.id === actionId
    ? override.value
    : savedStatus === 'completed'
}
export function planMatchesSelection(plan, explicitPlanId, examGoalId) {
  if (explicitPlanId) return plan?.id === explicitPlanId
  return plan?.status === 'active' && (!examGoalId || plan.exam_goal_id === examGoalId)
}
export function learningLinkContext(params, resolved = {}) {
  return {
    material: resolved.materialId,
    unit: resolved.unitId,
    plan: params.get('plan') || resolved.planId,
    task: params.get('task') || resolved.taskId,
  }
}
export function requiredLearningContext(params, { plan, pending = false, failed = false } = {}) {
  const requestedTask = params.get('task')
  const required = !!(requestedTask || params.get('plan'))
  return {
    pending: required && pending,
    invalidTask:
      !!requestedTask &&
      !pending &&
      !failed &&
      !(plan?.tasks ?? []).some((task) => task.id === requestedTask),
  }
}
