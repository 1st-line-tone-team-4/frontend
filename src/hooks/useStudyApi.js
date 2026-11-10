import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  USE_MOCK,
  mockResponse,
  createIdempotencyKey,
  captureSession,
  assertSession,
  ApiError,
  canceledError,
} from '@/api/client'
import { waitForJob, getJob, retryJob, restartJob } from '@/api/jobs'
import * as Api from '@/api/study'
import { useStudyStore } from '@/stores/useStudyStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAiStore } from '@/stores/useAiStore'
import {
  isDefinitiveRejection,
  recoveryDecision,
  createNavigationFence,
  planMatchesSelection,
} from '@/utils/studyModel'
import { formatDday } from '@/utils/format'

export {
  useMaterial,
  useMaterials,
  useUploadMaterial,
  useDeleteMaterial,
  useArchiveMaterial,
  useUnits,
  useConcepts,
  useConfirmConceptsAndPlan,
} from './useMaterialApi'
const live = (...ids) => !USE_MOCK && !!useAuthStore.getState().accessToken && ids.every(Boolean)
const retainedOperations = new Map()
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) retainedOperations.clear()
})
const activeJob = (job) => ['queued', 'running'].includes(job?.status)

export function useResourceId(field, parameter, explicit) {
  const [params] = useSearchParams()
  const saved = useStudyStore((s) => s[field])
  return explicit !== undefined ? explicit : params.get(parameter) || saved
}
function useRead(key, read, enabled = true, extra = {}) {
  const version = useAuthStore((s) => s.sessionVersion)
  return useQuery({
    queryKey: [...key, version],
    queryFn: ({ signal }) => read({ signal }),
    enabled: live(enabled),
    retry: false,
    ...extra,
  })
}
async function allPages(read, options, params = {}) {
  const items = []
  const seen = new Set()
  let cursor
  do {
    const page = await read({ ...params, limit: 100, ...(cursor ? { cursor } : {}) }, options)
    items.push(...page.items)
    cursor = page.nextCursor
    if (cursor && seen.has(cursor)) throw new Error('Pagination did not advance.')
    seen.add(cursor)
  } while (cursor)
  return { items, nextCursor: null }
}

// One retained operation, with explicit read-only observation and explicit job recovery.
// An uncertain POST is replayed only by the user, with its original body/key/model.
export function useStudyAction(
  start,
  finish = (value) => value,
  { onSuccess, invalidate = [], mock, actionKey = 'study-action' } = {},
) {
  const operation = useRef(retainedOperations.get(actionKey) ?? null)
  const controller = useRef(null)
  const [job, setJob] = useState(() => retainedOperations.get(actionKey)?.job ?? null)
  const [blocked, setBlocked] = useState(() => !!retainedOperations.get(actionKey)?.blocked)
  const version = useAuthStore((s) => s.sessionVersion)
  const location = useLocation()
  const navigationScope = useMemo(
    () => ({ version, key: location.key, pathname: location.pathname, search: location.search }),
    [version, location.key, location.pathname, location.search],
  )
  const navigation = useRef(createNavigationFence(navigationScope))
  const qc = useQueryClient()
  const callbacks = useRef({ start, finish, onSuccess, invalidate })
  useEffect(() => {
    callbacks.current = { start, finish, onSuccess, invalidate }
  })
  useLayoutEffect(() => {
    const fence = navigation.current
    fence.enter(navigationScope)
    return () => {
      fence.leave()
      controller.current?.abort()
    }
  }, [navigationScope])
  const assertNavigation = (scope) => {
    if (!navigation.current.isCurrent(scope)) throw canceledError()
  }
  const mutation = useMutation({
    retry: false,
    mutationFn: async ({ input, scope }) => {
      assertNavigation(scope)
      if (USE_MOCK) {
        const result = await mockResponse(typeof mock === 'function' ? mock(input) : (mock ?? {}))
        assertNavigation(scope)
        return result
      }
      const recovery = input?.__recovery
      if (!recovery && operation.current?.blocked)
        throw new ApiError('먼저 이전 요청의 상태를 확인해 주세요.', { code: 'OPERATION_PENDING' })
      if (!recovery) {
        operation.current = {
          input: structuredClone(input),
          key: createIdempotencyKey(),
          version: captureSession(),
          modelId: useAiStore.getState().modelId,
          blocked: true,
          job: null,
        }
        retainedOperations.set(actionKey, operation.current)
        setBlocked(true)
        setJob(null)
      }
      const op = operation.current
      if (!op) throw new Error('다시 조회할 요청이 없어요.')
      controller.current?.abort()
      controller.current = new AbortController()
      const options = {
        signal: controller.current.signal,
        idempotencyKey: op.key,
        modelId: op.modelId,
      }
      assertSession(op.version, options.signal)
      assertNavigation(scope)
      try {
        let accepted
        if (recovery === 'poll') {
          if (!op.job)
            throw new Error('작업 ID를 아직 받지 못했어요. 같은 요청 확인을 이용해 주세요.')
          const observed = await getJob(op.job.id, options)
          accepted = { job: { ...observed, model_id: observed.model_id || op.modelId } }
        } else if (recovery === 'retry' || recovery === 'restart') {
          const current = await getJob(op.job.id, options)
          assertSession(op.version, options.signal)
          assertNavigation(scope)
          const decision = recoveryDecision(current, {
            restart: recovery === 'restart',
            acknowledge: input.acknowledge,
            modelId: op.modelId,
          })
          if (decision === 'observe') {
            accepted = { job: { ...current, model_id: op.modelId } }
          } else {
            if (decision === 'missing-model')
              throw new Error(
                '원래 모델을 확인할 수 없어 다시 호출하지 않아요. 기존 작업 상태만 조회할 수 있어요.',
              )
            if (decision === 'blocked')
              throw new Error(
                '작업 상태와 재시도 조건을 확인해 주세요. 다시 시작하려면 추가 비용 가능성에 동의해야 해요.',
              )
            op.recoveryKey ??= createIdempotencyKey()
            accepted =
              decision === 'retry'
                ? await retryJob(current.id, { ...options, idempotencyKey: op.recoveryKey })
                : await restartJob(
                    current.id,
                    { acknowledge_possible_duplicate_cost: true },
                    { ...options, idempotencyKey: op.recoveryKey },
                  )
          }
          op.recoveryKey = null
        } else {
          accepted = await callbacks.current.start(op.input, options)
        }
        assertSession(op.version, options.signal)
        assertNavigation(scope)
        if (accepted?.job) {
          op.job = { ...accepted.job, model_id: accepted.job.model_id || op.modelId }
          op.modelId = op.job.model_id
          setJob(op.job)
          const completed = await waitForJob(op.job, { signal: options.signal, interval: 2000 })
          assertSession(op.version, options.signal)
          assertNavigation(scope)
          op.job = { ...completed, model_id: op.modelId }
          setJob(op.job)
          accepted = op.job
        }
        const result = await callbacks.current.finish(accepted, op.input, options)
        assertSession(op.version, options.signal)
        assertNavigation(scope)
        op.blocked = false
        setBlocked(false)
        return result
      } catch (error) {
        assertSession(op.version)
        assertNavigation(scope)
        if (error.job) {
          op.job = { ...error.job, model_id: op.modelId }
          setJob(op.job)
        }
        // Only an explicit, definitive rejection before job acceptance releases this action.
        if (!op.job && isDefinitiveRejection(error)) {
          op.blocked = false
          setBlocked(false)
        }
        throw error
      }
    },
    onSuccess: (value, { scope }) => {
      assertNavigation(scope)
      const op = operation.current
      if (!USE_MOCK) assertSession(op.version)
      if (retainedOperations.get(actionKey) === op) retainedOperations.delete(actionKey)
      callbacks.current.onSuccess?.(value)
      callbacks.current.invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
    },
  })
  const scopedCallbacks = (options = {}) =>
    Object.fromEntries(
      Object.entries(options).map(([key, value]) => [
        key,
        typeof value === 'function'
          ? (...args) => {
              if (navigation.current.isCurrent(navigationScope)) return value(...args)
            }
          : value,
      ]),
    )
  const invoke = (input, options) =>
    mutation.mutate({ input, scope: navigationScope }, scopedCallbacks(options))
  const visible = mutation.variables?.scope === navigationScope
  return {
    ...mutation,
    data: visible ? mutation.data : undefined,
    error: visible ? mutation.error : null,
    isSuccess: visible && mutation.isSuccess,
    isError: visible && mutation.isError,
    isPending: visible && mutation.isPending,
    mutate: invoke,
    mutateAsync: async (input, options) => {
      const result = await mutation.mutateAsync(
        { input, scope: navigationScope },
        scopedCallbacks(options),
      )
      assertNavigation(navigationScope)
      return result
    },
    job,
    blocked,
    retryPolling: () => invoke({ __recovery: 'poll' }),
    observeJob: (existing) => {
      operation.current = {
        input: null,
        key: createIdempotencyKey(),
        version: captureSession(),
        modelId:
          existing?.model_id ||
          (operation.current?.job?.id === (typeof existing === 'string' ? existing : existing?.id)
            ? operation.current.modelId
            : null),
        blocked: true,
        job: typeof existing === 'string' ? { id: existing } : existing,
      }
      retainedOperations.set(actionKey, operation.current)
      setBlocked(true)
      return invoke({ __recovery: 'poll' })
    },
    repeatRequest: () => invoke({ __recovery: 'repeat' }),
    recoverJob: ({ restart = false, acknowledge = false } = {}) =>
      invoke({ __recovery: restart ? 'restart' : 'retry', acknowledge }),
    cancelObservation: () => controller.current?.abort(),
  }
}

export const useMe = () => useRead(['me'], Api.getMe)
export const useExamGoals = () =>
  useRead(['exam-goals'], (options) => allPages(Api.listExamGoals, options))
export function useToday() {
  const examGoalId = useStudyStore((s) => s.examGoalId)
  return useRead(['today', examGoalId], (options) =>
    Api.getToday(examGoalId ? { exam_goal_id: examGoalId } : undefined, options),
  )
}
export function useDday() {
  const { data } = useToday()
  return USE_MOCK ? 'D-5' : formatDday(data?.days_remaining)
}
export function useCreateExamGoal() {
  return useStudyAction(Api.createExamGoal, undefined, {
    actionKey: 'exam-goal',
    mock: { id: 'mock-goal' },
    onSuccess: (goal) => useStudyStore.getState().setIds({ examGoalId: goal.id, planId: null }),
    invalidate: ['exam-goals', 'today'],
  })
}
export function useStudyPlan() {
  const [params] = useSearchParams()
  const explicitPlanId = params.get('plan')
  const planId = useResourceId('planId', 'plan')
  const examGoalId = useStudyStore((s) => s.examGoalId)
  return useRead(['plan', planId, examGoalId, explicitPlanId], async (options) => {
    if (planId) {
      const plan = await Api.getStudyPlan(planId, options)
      if (planMatchesSelection(plan, explicitPlanId, examGoalId)) return plan
    }
    const { items } = await Api.listStudyPlans(
      { status: 'active', limit: 1, ...(examGoalId ? { exam_goal_id: examGoalId } : {}) },
      options,
    )
    return items[0] ? Api.getStudyPlan(items[0].id, options) : null
  })
}
export function useReschedulePlan() {
  return useStudyAction((id, options) => Api.rescheduleStudyPlan(id, {}, options), undefined, {
    actionKey: 'reschedule-plan',
    mock: { id: 'mock-plan' },
    onSuccess: (plan) => useStudyStore.getState().setIds({ planId: plan.id }),
    invalidate: ['plan', 'today'],
  })
}
export function useLearningExplanation(conceptVersionId, language = 'ko') {
  return useRead(
    ['learning-explanation', conceptVersionId, language],
    async (options) => {
      const { items } = await Api.listLearningExplanations(conceptVersionId, options)
      return (
        items.find((x) => x.explanation_language === language && x.status === 'ready') ??
        items.find((x) => x.explanation_language === language) ??
        null
      )
    },
    !!conceptVersionId,
    { refetchInterval: (query) => (query.state.data?.status === 'generating' ? 3000 : false) },
  )
}
export function useGenerateExplanation() {
  return useStudyAction(
    Api.createLearningExplanation,
    (job, _input, options) => Api.getLearningExplanation(job.resource_id, options),
    { actionKey: 'explanation', invalidate: ['learning-explanation'] },
  )
}
export function useCreateQuestionSet() {
  return useStudyAction(
    (body, options) =>
      Api.createQuestionSet({ acknowledge_possible_duplicate_cost: false, ...body }, options),
    (job) => job.resource_id,
    {
      actionKey: 'question-set',
      mock: 'mock-set',
      onSuccess: (id) => useStudyStore.getState().setIds({ questionSetId: id }),
      invalidate: ['question-set'],
    },
  )
}
export function useQuestionSet(explicit) {
  const id = useResourceId('questionSetId', 'set', explicit)
  return useRead(['question-set', id], (options) => Api.getQuestionSet(id, options), !!id, {
    refetchInterval: (q) =>
      q.state.data?.status === 'generating' ||
      q.state.data?.items?.some((x) => x.latest_attempt?.status === 'grading')
        ? 3000
        : false,
  })
}
export function useSubmitAttempt() {
  return useStudyAction(
    ({ questionId, questionSetId, answer }, options) =>
      Api.submitAttempt(questionId, { answer, question_set_id: questionSetId }, options),
    (job, _input, options) => Api.getAttempt(job.resource_id, options),
    { actionKey: 'grade', invalidate: ['question-set', 'today', 'weaknesses'] },
  )
}
export function useCreateTeachbackSession() {
  return useStudyAction(Api.createTeachbackSession, undefined, {
    actionKey: 'create-session',
    mock: { id: 'mock-session' },
    onSuccess: (session) => useStudyStore.getState().setIds({ sessionId: session.id }),
    invalidate: ['session-records'],
  })
}
export function useTeachbackSession(explicit) {
  const id = useResourceId('sessionId', 'session', explicit)
  return useRead(['session', id], (options) => Api.getTeachbackSession(id, options), !!id)
}
export function useTeachbackMessages(explicit) {
  const id = useResourceId('sessionId', 'session', explicit)
  return useRead(
    ['session-messages', id],
    (options) => Api.listTeachbackMessages(id, options).then((r) => r.items),
    !!id,
  )
}
export function useSendTeachbackMessage() {
  return useStudyAction(
    ({ sessionId, content, isFinal, inputMode = 'text' }, options) =>
      isFinal
        ? Api.submitFinalTeachbackAnswer(sessionId, content, inputMode, options)
        : Api.sendTeachbackMessage(sessionId, content, inputMode, options),
    undefined,
    { actionKey: 'message', invalidate: ['session', 'session-messages'] },
  )
}
export function useCompleteTeachback() {
  return useStudyAction(Api.completeTeachbackSession, undefined, {
    actionKey: 'complete-session',
    invalidate: ['session', 'report', 'today', 'weaknesses', 'session-records'],
  })
}
export function useTeachbackReport(explicit) {
  const id = useResourceId('sessionId', 'session', explicit)
  return useRead(['report', id], (options) => Api.getTeachbackReport(id, options), !!id)
}
export function useReportFeedback() {
  return useStudyAction(
    ({ sessionId, ...body }, options) => Api.reportTeachbackFeedback(sessionId, body, options),
    undefined,
    { actionKey: 'feedback' },
  )
}
export function useUpdateImprovementAction() {
  return useStudyAction(
    ({ actionId, status, followup_session_id = null }, options) =>
      Api.updateImprovementAction(actionId, { status, followup_session_id }, options),
    undefined,
    { actionKey: 'improvement-action', invalidate: ['actions', 'today'] },
  )
}
export function useUpdatePlanTask() {
  return useStudyAction(
    ({ taskId, status }, options) => Api.updatePlanTask(taskId, { status }, options),
    undefined,
    { actionKey: 'plan-task', invalidate: ['plan', 'today'] },
  )
}
export const useImprovementActions = () =>
  useRead(['actions'], (options) =>
    allPages(Api.listImprovementActions, options).then((r) => r.items),
  )
export const useWeaknesses = () =>
  useRead(['weaknesses'], (options) => allPages(Api.listWeaknesses, options).then((r) => r.items))
export const useSessionRecords = () =>
  useRead(['session-records'], (options) =>
    allPages(Api.listSessionRecords, options).then((r) => r.items),
  )
export function useAbandonSession() {
  return useStudyAction(Api.abandonTeachbackSession, undefined, {
    actionKey: 'abandon-session',
    invalidate: ['session', 'session-records', 'today'],
  })
}
export { activeJob }
