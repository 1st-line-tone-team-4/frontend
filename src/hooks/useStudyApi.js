import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCK, mockResponse } from '@/api/client'
import { waitForJob } from '@/api/jobs'
import * as Api from '@/api/study'
import { useStudyStore } from '@/stores/useStudyStore'
import { formatDday } from '@/utils/format'

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

// 상단 D-day 칩 · 목 모드에선 시안 그대로 'D-5'
export function useDday() {
  const { data } = useToday()
  if (USE_MOCK) return 'D-5'
  return formatDday(data?.days_remaining)
}

export function useCreateExamGoal() {
  const setIds = useStudyStore((s) => s.setIds)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mockOr(Api.createExamGoal, { id: 'mock-goal' }),
    onSuccess: (goal) => {
      setIds({ examGoalId: goal.id })
      qc.invalidateQueries({ queryKey: ['exam-goals'] })
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
        await Api.completeMaterialUpload(material.id)
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
      async ({ materialId, examGoalId, concepts }) => {
        await Api.confirmConcepts(materialId, concepts)
        return Api.createStudyPlan({ exam_goal_id: examGoalId, material_ids: [materialId] })
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

/* ── 자습 설명 ────────────────────────────────── */
// 해당 개념 버전의 최신 설명 · 없으면 생성 요청 후 완료까지 기다려요
export function useLearningExplanation(conceptVersionId, language = 'ko') {
  return useQuery({
    queryKey: ['learning-explanation', conceptVersionId, language],
    queryFn: async () => {
      const { items } = await Api.listLearningExplanations(conceptVersionId)
      const ready = items.find((x) => x.status === 'ready' && x.explanation_language === language)
      if (ready) return ready
      const generating = items.find(
        (x) => x.status === 'generating' && x.explanation_language === language,
      )
      if (generating) {
        await waitForJob({ id: generating.latest_job_id, status: 'running' })
        return Api.getLearningExplanation(generating.id)
      }
      const { job } = await Api.createLearningExplanation({
        concept_version_id: conceptVersionId,
        explanation_language: language,
      })
      await waitForJob(job)
      return Api.getLearningExplanation(job.resource_id)
    },
    enabled: live(conceptVersionId),
    staleTime: Infinity,
    retry: false,
  })
}

/* ── 문제 ─────────────────────────────────────── */
export function useCreateQuestionSet() {
  const setIds = useStudyStore((s) => s.setIds)
  return useMutation({
    mutationFn: mockOr(async (body) => {
      const { job } = await Api.createQuestionSet({
        acknowledge_possible_duplicate_cost: false,
        ...body,
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
      const { job } = await Api.sendTeachbackMessage(sessionId, content, inputMode)
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
      const { job } = await Api.completeTeachbackSession(sessionId)
      return waitForJob(job)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
      qc.invalidateQueries({ queryKey: ['report'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useTeachbackReport() {
  const sessionId = useStudyStore((s) => s.sessionId)
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

export const useUpdateImprovementAction = () =>
  useMutation({
    mutationFn: mockOr(({ actionId, status }) => Api.updateImprovementAction(actionId, { status })),
  })

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
