import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCK, mockResponse } from '@/api/client'
import { listAIModels, resolveModelId } from '@/api/ai'
import { canRetryJob, getJob, restartJob, retryJob, waitForJob } from '@/api/jobs'
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

// 업로드 URL 발급 → 파일 업로드 → 분석 시작
export function useUploadMaterial() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(
      async (file) => {
        const { material, upload_url } = await Api.createMaterialUpload(file)
        await Api.putFileToSignedUrl(upload_url, file)
        await Api.completeMaterialUpload(material.id, await resolveModelId())
        return material
      },
      { id: 'mock-material' },
    ),
    onSuccess: (material) => {
      setIds({ materialId: material.id })
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}

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
  return useQuery({
    queryKey: ['plan', planId],
    // 저장된 계획 ID 가 없으면 활성 계획 목록의 첫 번째를 사용
    queryFn: async () => {
      if (planId) return Api.getStudyPlan(planId)
      const { items } = await Api.listStudyPlans({ status: 'active', limit: 1 })
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
    refetchInterval: (q) => (['queued', 'running'].includes(q.state.data?.status) ? 2000 : false),
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
export function useCreateQuestionSet() {
  const setIds = useStudyStore((s) => s.setIds)
  return useMutation({
    mutationFn: mockOr(async (body) => {
      const { job } = await Api.createQuestionSet({
        acknowledge_possible_duplicate_execution: false,
        ...body,
        model_id: await resolveModelId(),
      })
      await waitForJob(job)
      return job.resource_id
    }, 'mock-set'),
    onSuccess: (setId) => setIds({ questionSetId: setId }),
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

// 답 제출 → 채점 완료까지 기다린 뒤 채점 결과(attempt) 반환
export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, questionSetId, answer }) => {
      const { job } = await Api.submitAttempt(questionId, {
        answer,
        question_set_id: questionSetId,
        model_id: await resolveModelId(),
      })
      await waitForJob(job)
      return Api.getAttempt(job.resource_id)
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
export function useTeachbackReport(sessionIdOverride) {
  const storedId = useStudyStore((s) => s.sessionId)
  const sessionId = sessionIdOverride ?? storedId
  return useQuery({
    queryKey: ['report', sessionId],
    queryFn: () => Api.getTeachbackReport(sessionId),
    enabled: live(sessionId),
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
