import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCK, mockResponse } from '@/api/client'
import { listAIModels, resolveModelId } from '@/api/ai'
import { canRetryJob, getJob, parseRetryAfter, restartJob, retryJob, waitForJob } from '@/api/jobs'
import * as Api from '@/api/study'
import { useStudyStore } from '@/stores/useStudyStore'
import { daysUntil, formatDday } from '@/utils/format'

/**
 * React Query 훅 모음
 * - 목 모드(VITE_USE_MOCK=true)에서는 조회를 보내지 않아요 → 화면이 자체 더미 데이터를 보여줘요
 * - 목 모드의 생성/수정은 가짜 응답으로 바로 성공해서 화면 이동 흐름만 확인할 수 있어요
 */
const live = (...ids) => !USE_MOCK && ids.every(Boolean)
const mockOr = (fn, mock = {}) => (USE_MOCK ? () => mockResponse(mock) : fn)

const PROCESSING = ['upload_pending', 'queued', 'processing']

/* ── 사용자 · 목표 · 오늘 ─────────────────────── */
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: Api.getMe, enabled: live(true) })

export const useExamGoals = () =>
  useQuery({ queryKey: ['exam-goals'], queryFn: () => Api.listExamGoals(), enabled: live(true) })

// 지금 공부 중인 과목(시험 목표) · 저장된 것이 없거나 목록에 없으면 첫 번째 진행 중 목표
export function useCurrentExamGoal() {
  const examGoalId = useStudyStore((s) => s.examGoalId)
  const goals = useExamGoals()
  const today = useToday()
  const items = goals.data?.items ?? []
  const active = items.filter((g) => g.status === 'active')
  // 저장된 과목 → 오늘 화면이 고른 과목(GET /today 의 exam_goal_id) → 진행 중 첫 과목
  const current =
    items.find((g) => g.id === examGoalId) ??
    items.find((g) => g.id === today.data?.exam_goal_id) ??
    active[0] ??
    items[0] ??
    null
  return { goals, items, active, current }
}

// 과목 바꾸기 → 그 목표의 진행 중 계획 · 자료로 흐름 ID 를 모두 바꾸고 화면 데이터를 새로 받아요
export function useSwitchExamGoal() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goal) => {
      const { items } = await Api.listStudyPlans({
        exam_goal_id: goal.id,
        status: 'active',
        limit: 1,
      })
      return { goal, plan: items[0] ?? null }
    },
    onSuccess: ({ goal, plan }) => {
      const materialIds = plan?.material_ids ?? []
      setIds({
        examGoalId: goal.id,
        examDate: goal.exam_date ?? null,
        planId: plan?.id ?? null,
        materialIds,
        materialId: materialIds[0] ?? null,
        // 이전 과목에서 이어 보던 문제 · 설명은 끊어요
        questionSetId: null,
        sessionId: null,
      })
      qc.invalidateQueries()
    },
  })
}

export function useToday() {
  const examGoalId = useStudyStore((s) => s.examGoalId)
  return useQuery({
    queryKey: ['today', examGoalId],
    queryFn: () => Api.getToday(examGoalId ? { exam_goal_id: examGoalId } : undefined),
    enabled: live(true),
  })
}

// 상단 D-day 칩 · 저장된 시험 날짜를 기준으로 계산
export function useDday() {
  const examDate = useStudyStore((s) => s.examDate)
  const { data } = useToday()
  if (USE_MOCK) return formatDday(daysUntil(examDate)) ?? 'D-5'
  return formatDday(daysUntil(examDate) ?? data?.days_remaining)
}

export function useCreateExamGoal() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(Api.createExamGoal, { id: 'mock-goal' }),
    onSuccess: (goal, variables) => {
      setIds({ examGoalId: goal.id, examDate: variables?.exam_date ?? goal?.exam_date ?? null })
      qc.invalidateQueries({ queryKey: ['exam-goals'] })
    },
  })
}

// 시험 이름 · 날짜 · 상태 수정 (PATCH /exam-goals/{id} · 기존 계획은 그대로, 날짜를 바꾸면 '코스 다시 맞추기')
export function useUpdateExamGoal() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(({ id, ...body }) => Api.updateExamGoal(id, body)),
    onSuccess: (goal, { exam_date }) => {
      if (exam_date) setIds({ examDate: exam_date })
      qc.invalidateQueries({ queryKey: ['exam-goals'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

/* ── 자료 ─────────────────────────────────────── */
export function useMaterial(materialId) {
  return useQuery({
    queryKey: ['material', materialId],
    queryFn: () => Api.getMaterial(materialId),
    enabled: live(materialId),
    // 분석이 끝날 때까지 3초마다 다시 조회
    refetchInterval: (q) => (PROCESSING.includes(q.state.data?.processing_status) ? 3000 : false),
  })
}

export const useMaterials = () =>
  useQuery({ queryKey: ['materials'], queryFn: () => Api.listMaterials(), enabled: live(true) })

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(Api.deleteMaterial),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })
}

export function useArchiveMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(({ id, archived }) => Api.archiveMaterial(id, archived)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  })
}

export const useUnits = (materialId) =>
  useQuery({
    queryKey: ['units', materialId],
    queryFn: () => Api.listUnits(materialId),
    enabled: live(materialId),
  })

export const useConcepts = (materialId) =>
  useQuery({
    queryKey: ['concepts', materialId],
    queryFn: () => Api.listConcepts(materialId),
    enabled: live(materialId),
  })

// 개념 확정 → 학습 계획 생성
export function useConfirmConceptsAndPlan() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(
      async ({ materialId, materialIds, examGoalId, concepts }) => {
        const grouped = concepts.reduce((groups, concept) => {
          const id = concept.material_id ?? materialId
          groups[id] = [...(groups[id] ?? []), concept]
          return groups
        }, {})
        const ids = (materialIds?.length ? materialIds : [materialId]).filter(
          (id) => grouped[id]?.length,
        )
        await Promise.all(
          ids.map((id) =>
            Api.confirmConcepts(
              id,
              grouped[id].map((concept) => {
                const next = { ...concept }
                delete next.material_id
                return next
              }),
            ),
          ),
        )
        return Api.createStudyPlan({ exam_goal_id: examGoalId, material_ids: ids })
      },
      { id: 'mock-plan' },
    ),
    onSuccess: (plan) => {
      setIds({ planId: plan.id })
      qc.invalidateQueries({ queryKey: ['concepts'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

/* ── 계획 ─────────────────────────────────────── */
export function useStudyPlan() {
  const planId = useStudyStore((s) => s.planId)
  const examGoalId = useStudyStore((s) => s.examGoalId)
  return useQuery({
    queryKey: ['plan', planId, examGoalId],
    // 저장된 계획 ID 가 없으면 지금 과목의 활성 계획 (과목도 없으면 활성 계획 첫 번째)
    queryFn: async () => {
      if (planId) return Api.getStudyPlan(planId)
      const { items } = await Api.listStudyPlans({
        status: 'active',
        limit: 1,
        ...(examGoalId && { exam_goal_id: examGoalId }),
      })
      return items[0] ? Api.getStudyPlan(items[0].id) : null
    },
    enabled: live(true),
  })
}

export function useReschedulePlan() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(Api.rescheduleStudyPlan, { id: 'mock-plan' }),
    onSuccess: (plan) => {
      setIds({ planId: plan.id })
      qc.invalidateQueries({ queryKey: ['plan'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

// 할 일 건너뛰기 · 되돌리기 · 복습 완료 (PATCH /plan-tasks/{id})
export function useUpdatePlanTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(({ taskId, status }) => Api.updatePlanTask(taskId, status)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] })
      qc.invalidateQueries({ queryKey: ['plan'] })
    },
  })
}

/* ── 작업(job) ────────────────────────────────── */
export const useJob = (jobId) =>
  useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId),
    enabled: live(jobId),
    // 서버 제한(같은 job 2초에 1회)에 걸리지 않도록 여유 있게 조회
    refetchInterval: (q) => (['queued', 'running'].includes(q.state.data?.status) ? 3000 : false),
  })

// 실패한 job 복구 · retry 가능하면 같은 job 재시도, 아니면 restart (호출 전에 중복 실행 동의를 받아요)
export function useRecoverJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ job, modelId }) => {
      const id = modelId ?? (await resolveModelId())
      const res = canRetryJob(job) ? await retryJob(job.id, id) : await restartJob(job.id, id)
      return res?.job ?? res
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

/* ── 자습 설명 ────────────────────────────────── */
// 해당 개념 버전의 설명 목록 조회만 해요 (명세: 새 설명 생성은 사용자가 요청할 때만)
// → { ready: 최신 완성 설명, latest: 가장 최근 설명(생성 중 · 실패 포함) }
export function useLearningExplanation(conceptVersionId, language = 'ko') {
  return useQuery({
    queryKey: ['learning-explanation', conceptVersionId, language],
    queryFn: async () => {
      const { items } = await Api.listLearningExplanations(conceptVersionId)
      const mine = items.filter((x) => x.explanation_language === language)
      return { ready: mine.find((x) => x.status === 'ready') ?? null, latest: mine[0] ?? null }
    },
    enabled: live(conceptVersionId),
    refetchInterval: (q) => (q.state.data?.latest?.status === 'generating' ? 2000 : false),
  })
}

// '설명 만들기' 버튼 → POST /learning-explanations (결과는 목록 폴링으로 받아요)
export function useCreateLearningExplanation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conceptVersionId, language = 'ko' }) =>
      Api.createLearningExplanation({
        concept_version_id: conceptVersionId,
        explanation_language: language,
        model_id: await resolveModelId(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning-explanation'] }),
  })
}

/* ── 문제 ─────────────────────────────────────── */
// POST /question-sets → 202 { job } · job.resource_id 가 새 문제 세트 id 예요
// 409 JOB_IN_PROGRESS: 같은 조건(단원·버전 집합·할 일·문제 수·난이도)으로 이미 만드는 중
// 409 DUPLICATE_EXECUTION_ACK_REQUIRED: 결과를 알 수 없는 이전 작업이 있어 중복 실행 동의가 필요해요
//   → 화면에서 동의를 받고 acknowledge_possible_duplicate_execution: true 로 다시 보내요
export function useCreateQuestionSet() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(async (body) => {
      const { job } = await Api.createQuestionSet({
        acknowledge_possible_duplicate_execution: false,
        ...body,
        model_id: await resolveModelId(),
      })
      const done = await waitForJob(job)
      return done.resource_id ?? job.resource_id
    }, 'mock-set'),
    onSuccess: (setId) => setIds({ questionSetId: setId }),
    // 성공 · 실패 모두 '최근 만든 문제' 목록을 새로 받아요 (만드는 중인 세트가 보이도록)
    onSettled: () => qc.invalidateQueries({ queryKey: ['question-sets'] }),
  })
}

export function useQuestionSet() {
  const setId = useStudyStore((s) => s.questionSetId)
  return useQuery({
    queryKey: ['question-set', setId],
    queryFn: () => Api.getQuestionSet(setId),
    enabled: live(setId),
  })
}

// 채점 결과(attempt) 가 나올 때까지 attempt 를 직접 조회해요
// /jobs 는 2초에 1회 제한이 있어 결과가 늦게 보여요 → 객관식은 1초 안에 채점되므로 짧게 확인해요
const ATTEMPT_POLL_MS = [400, 600, 800, 1000, 1500] // 이후 1.5초 간격
const ATTEMPT_TIMEOUT_MS = 90_000
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForAttempt(attemptId) {
  const started = Date.now()
  for (let i = 0; Date.now() - started < ATTEMPT_TIMEOUT_MS; i++) {
    await wait(ATTEMPT_POLL_MS[Math.min(i, ATTEMPT_POLL_MS.length - 1)])
    try {
      const attempt = await Api.getAttempt(attemptId)
      if (attempt.status === 'graded') return attempt
      if (attempt.status === 'failed') {
        throw { code: 'GRADE_FAILED', message: '채점에 실패했어요. 다시 제출해 주세요.', attempt }
      }
    } catch (err) {
      if (err?.code === 'GRADE_FAILED') throw err
      if (err?.status === 429) {
        await wait(parseRetryAfter(err.retryAfter) ?? 2000)
        continue
      }
      if (err?.status && err.status < 500) throw err
      // 네트워크 · 5xx 는 다음 조회에서 다시 시도
    }
  }
  throw { code: 'JOB_TIMEOUT', message: '채점이 오래 걸리고 있어요. 잠시 후 다시 확인해 주세요.' }
}

// 답 제출 → 채점 완료까지 기다린 뒤 채점 결과(attempt) 반환
// 202 job.resource_id = attempt id (resource_type: attempt)
export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, questionSetId, answer }) => {
      const { job } = await Api.submitAttempt(questionId, {
        answer,
        question_set_id: questionSetId,
        model_id: await resolveModelId(),
      })
      if (job.resource_type === 'attempt' && job.resource_id) {
        return waitForAttempt(job.resource_id)
      }
      const done = await waitForJob(job)
      return Api.getAttempt(done.resource_id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question-set'] }),
  })
}

/* ── Teach-back ──────────────────────────────── */
export function useCreateTeachbackSession() {
  const setIds = useStudyStore((s) => s.setIds)
  return useMutation({
    mutationFn: mockOr(Api.createTeachbackSession, { id: 'mock-session' }),
    onSuccess: (session) => setIds({ sessionId: session.id }),
  })
}

export function useTeachbackSession() {
  const sessionId = useStudyStore((s) => s.sessionId)
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => Api.getTeachbackSession(sessionId),
    enabled: live(sessionId),
  })
}

export function useTeachbackMessages() {
  const sessionId = useStudyStore((s) => s.sessionId)
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: () => Api.listTeachbackMessages(sessionId).then((r) => r.items),
    enabled: live(sessionId),
  })
}

// 설명 전송 · AI 질문을 3번 다 받았으면 final-answer 로 제출
export function useSendTeachbackMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, content, isFinal, inputMode = 'text' }) => {
      if (isFinal) return Api.submitFinalTeachbackAnswer(sessionId, content, inputMode)
      const { job } = await Api.sendTeachbackMessage(
        sessionId,
        content,
        inputMode,
        await resolveModelId(),
      )
      return waitForJob(job)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['session-messages'] })
      qc.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

// 설명 마치기 → 리포트 생성 완료까지 대기
export function useCompleteTeachback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(async (sessionId) => {
      const { job } = await Api.completeTeachbackSession(sessionId, await resolveModelId())
      return waitForJob(job)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
      qc.invalidateQueries({ queryKey: ['report'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

// sessionIdOverride: 다른 화면에서 특정 세션 리포트를 볼 때 (없으면 현재 세션)
export function useTeachbackReport(sessionIdOverride, { enabled = true } = {}) {
  const storedId = useStudyStore((s) => s.sessionId)
  const sessionId = sessionIdOverride ?? storedId
  return useQuery({
    queryKey: ['report', sessionId],
    queryFn: () => Api.getTeachbackReport(sessionId),
    enabled: enabled && live(sessionId),
  })
}

export const useReportFeedback = () =>
  useMutation({
    mutationFn: mockOr(({ sessionId, ...body }) => Api.reportTeachbackFeedback(sessionId, body)),
  })

export function useUpdateImprovementAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(({ actionId, status, followupSessionId = null }) =>
      Api.updateImprovementAction(actionId, { status, followup_session_id: followupSessionId }),
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })
}

/* ── 기록 ─────────────────────────────────────── */
export const useWeaknesses = () =>
  useQuery({
    queryKey: ['weaknesses'],
    queryFn: () => Api.listWeaknesses().then((r) => r.items),
    enabled: live(true),
  })

export const useSessionRecords = () =>
  useQuery({
    queryKey: ['session-records'],
    queryFn: () => Api.listSessionRecords().then((r) => r.items),
    enabled: live(true),
  })

/* ── 추가 조회 ────────────────────────────────── */
export const useBilling = () =>
  useQuery({ queryKey: ['billing'], queryFn: Api.getBillingCapabilities, enabled: live(true) })

export const useAIModels = () =>
  useQuery({ queryKey: ['ai-models'], queryFn: listAIModels, enabled: live(true) })

export const useImprovementActions = () =>
  useQuery({
    queryKey: ['actions'],
    queryFn: () => Api.listImprovementActions({ limit: 20 }).then((r) => r.items),
    enabled: live(true),
  })

export const useQuestionSets = (taskId) =>
  useQuery({
    queryKey: ['question-sets', taskId ?? null],
    queryFn: () =>
      Api.listQuestionSets({ limit: 10, ...(taskId && { task_id: taskId }) }).then((r) => r.items),
    enabled: live(true),
  })

export const useQuestionAttempts = (questionId, enabled = true) =>
  useQuery({
    queryKey: ['question-attempts', questionId],
    queryFn: () => Api.listQuestionAttempts(questionId, { limit: 20 }).then((r) => r.items),
    enabled: live(questionId) && enabled,
  })

export const useMaterialChunk = (materialId, chunkId) =>
  useQuery({
    queryKey: ['chunk', materialId, chunkId],
    queryFn: () => Api.getMaterialChunk(materialId, chunkId),
    enabled: live(materialId, chunkId),
  })

export const useConceptVersions = (materialId, conceptId, enabled = true) =>
  useQuery({
    queryKey: ['concept-versions', materialId, conceptId],
    queryFn: () => Api.listConceptVersions(materialId, conceptId),
    enabled: live(materialId, conceptId) && enabled,
  })

export function useAbandonSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(Api.abandonTeachbackSession),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
      qc.invalidateQueries({ queryKey: ['session-records'] })
    },
  })
}
