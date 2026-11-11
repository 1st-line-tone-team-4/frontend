import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  USE_MOCK,
  createIdempotencyKey,
  mockResponse,
  captureSession,
  assertSession,
} from '@/api/client'
import * as Api from '@/api/study'
import { getJob, retryJob, restartJob } from '@/api/jobs'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAiStore } from '@/stores/useAiStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { newUploadOperation, runUploadOperation } from '@/utils/uploadOperation'

const PROCESSING = ['upload_pending', 'queued', 'processing']
const operations = create(() => ({ operation: null, running: false, revision: 0 }))
const materialModels = new Map()
const recoveries = new Map()
const confirmations = new Map()
let activeController
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) {
    activeController?.abort()
    activeController = null
    materialModels.clear()
    recoveries.clear()
    confirmations.clear()
    operations.setState({ operation: null, running: false, revision: 0 })
  }
})
const useSession = () => useAuthStore((s) => s.sessionVersion)
const live = (...ids) => !USE_MOCK && !!useAuthStore.getState().accessToken && ids.every(Boolean)

export function useMaterial(materialId) {
  const session = useSession()
  const qc = useQueryClient()
  const result = useQuery({
    queryKey: ['material', materialId, session],
    queryFn: ({ signal }) => Api.getMaterial(materialId, { signal }),
    enabled: live(materialId),
    refetchInterval: (q) => (PROCESSING.includes(q.state.data?.processing_status) ? 3000 : false),
  })
  const status = result.data?.processing_status
  useEffect(() => {
    if (status === 'ready') {
      qc.invalidateQueries({ queryKey: ['units', materialId] })
      qc.invalidateQueries({ queryKey: ['concepts', materialId] })
      qc.invalidateQueries({ queryKey: ['materials'] })
    }
  }, [status, materialId, qc])
  return result
}

export function useMaterials({ include_archived = false } = {}) {
  const session = useSession()
  return useQuery({
    queryKey: ['materials', include_archived, session],
    queryFn: async ({ signal }) => {
      const items = []
      const seen = new Set()
      let cursor
      do {
        const page = await Api.listMaterials(
          { include_archived, limit: 100, ...(cursor ? { cursor } : {}) },
          { signal },
        )
        items.push(...page.items)
        cursor = page.nextCursor
        if (cursor && seen.has(cursor)) throw new Error('자료 목록 페이지를 다시 불러와 주세요.')
        seen.add(cursor)
      } while (cursor)
      return { items, nextCursor: null }
    },
    enabled: live(true),
    refetchInterval: (q) =>
      q.state.data?.items.some((m) => PROCESSING.includes(m.processing_status)) ? 3000 : false,
  })
}

export function useUploadMaterial() {
  const qc = useQueryClient()
  const state = operations()
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const mutation = useMutation({
    mutationFn: async (file) => {
      if (USE_MOCK) return mockResponse({ id: 'mock-material' })
      if (operations.getState().running) throw new Error('진행 중인 업로드를 먼저 확인해 주세요.')
      const session = captureSession()
      let op = operations.getState().operation
      if (!op || op.stage === 'accepted') {
        if (!useAiStore.getState().providerApiKey)
          throw new Error('연결 설정에서 API 키를 먼저 입력해 주세요.')
        op = newUploadOperation(file, useAiStore.getState().modelId, createIdempotencyKey)
        operations.setState({ operation: op })
      } else if (file && file !== op.file) {
        throw new Error(
          '이전 업로드의 결과를 먼저 확인해 주세요. 새 파일을 중복 전송하지 않았어요.',
        )
      }
      const abort = new AbortController()
      controller.current = abort
      activeController = abort
      operations.setState({ running: true })
      try {
        const material = await runUploadOperation(op, Api, {
          signal: abort.signal,
          check: () => assertSession(session),
          changed: () => {
            if (op.material) materialModels.set(op.material.id, op.modelId)
            operations.setState((s) => ({ revision: s.revision + 1 }))
          },
        })
        assertSession(session)
        if (abort.signal.aborted)
          throw Object.assign(new Error('로컬 대기를 중단했어요.'), { canceled: true })
        useStudyStore.getState().setIds({ materialId: material.id })
        qc.invalidateQueries({ queryKey: ['materials'] })
        qc.invalidateQueries({ queryKey: ['material', material.id] })
        return material
      } finally {
        if (activeController === abort) {
          activeController = null
          operations.setState({ running: false })
        }
      }
    },
    onSuccess: (material) => {
      if (USE_MOCK) useStudyStore.getState().setIds({ materialId: material.id })
    },
    retry: false,
  })
  return {
    ...mutation,
    isPending: state.running || mutation.isPending,
    operation: state.operation,
    resume: (options) => mutation.mutate(undefined, options),
    cancelObservation: () => controller.current?.abort(),
    dismiss: () => {
      if (operations.getState().running) return
      operations.setState({ operation: null })
      mutation.reset()
    },
  }
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: USE_MOCK ? () => mockResponse({}) : Api.deleteMaterial,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.removeQueries({ queryKey: ['material', id] })
      qc.removeQueries({ queryKey: ['units', id] })
      qc.removeQueries({ queryKey: ['concepts', id] })
      if (useStudyStore.getState().materialId === id)
        useStudyStore.getState().setIds({ materialId: null })
    },
  })
}

export function useArchiveMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }) =>
      USE_MOCK ? mockResponse({}) : Api.archiveMaterial(id, archived),
    onSuccess: (_, { id, archived }) => {
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['material', id] })
      if (archived && useStudyStore.getState().materialId === id)
        useStudyStore.getState().setIds({ materialId: null })
    },
  })
}

export function useUnits(materialId) {
  const session = useSession()
  return useQuery({
    queryKey: ['units', materialId, session],
    queryFn: ({ signal }) => Api.listUnits(materialId, { signal }),
    enabled: live(materialId),
  })
}
export function useConcepts(materialId) {
  const session = useSession()
  return useQuery({
    queryKey: ['concepts', materialId, session],
    queryFn: ({ signal }) => Api.listConcepts(materialId, { signal }),
    enabled: live(materialId),
  })
}

export function useConfirmConceptsAndPlan() {
  const qc = useQueryClient()
  const controller = useRef(null)
  const pending = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])
  return useMutation({
    mutationFn: async ({ materialId, examGoalId, concepts }) => {
      if (USE_MOCK) return mockResponse({ id: 'mock-plan' })
      if (pending.current) throw new Error('개념 확인 요청이 진행 중이에요.')
      pending.current = true
      controller.current = new AbortController()
      const signal = controller.current.signal
      const session = captureSession()
      try {
        const signature = JSON.stringify({ materialId, examGoalId, concepts })
        let operation = confirmations.get(signature)
        if (!operation) {
          operation = { planKey: createIdempotencyKey(), confirmed: false }
          confirmations.set(signature, operation)
        }
        if (!operation.confirmed) {
          try {
            await Api.confirmConcepts(materialId, concepts, { signal })
          } catch (error) {
            assertSession(session, signal)
            if (error.canceled) throw error
            // Reconcile an atomic PATCH whose response was lost. Never create a
            // second version if all current versions exactly reflect this request.
            if (error.status && error.status !== 409) throw error
            const current = await Api.listConcepts(materialId, { signal })
            assertSession(session, signal)
            const applied = concepts.every((c) => {
              const v = current.find((x) => x.concept_id === c.concept_id)?.current_version
              return (
                v?.is_confirmed &&
                v.id !== c.base_version_id &&
                v.name === c.name &&
                v.summary === c.summary &&
                JSON.stringify(v.checklist_items.map((k) => k.criterion)) ===
                  JSON.stringify(c.checklist_items) &&
                JSON.stringify(v.evidence.map((e) => e.chunk_id).sort()) ===
                  JSON.stringify([...c.evidence_chunk_ids].sort())
              )
            })
            if (!applied) throw error
          }
          assertSession(session, signal)
          operation.confirmed = true
        }
        const plan = await Api.createStudyPlan(
          { exam_goal_id: examGoalId, material_ids: [materialId] },
          { idempotencyKey: operation.planKey, signal },
        )
        assertSession(session, signal)
        useStudyStore.getState().setIds({ planId: plan.id })
        return plan
      } finally {
        pending.current = false
      }
    },
    onSuccess: (plan) => {
      if (USE_MOCK) useStudyStore.getState().setIds({ planId: plan.id })
      for (const key of ['concepts', 'today', 'plan', 'materials'])
        qc.invalidateQueries({ queryKey: [key] })
    },
    retry: false,
  })
}

export function useMaterialJob(material) {
  const session = useSession()
  return useQuery({
    queryKey: ['material-job', material?.latest_job_id, session],
    queryFn: ({ signal }) => getJob(material.latest_job_id, { signal }),
    enabled: live(material?.latest_job_id),
    staleTime: 2500,
    refetchInterval: (q) => (['queued', 'running'].includes(q.state.data?.status) ? 3000 : false),
    retry: false,
  })
}

export function useRecoverMaterialJob(material, job) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ restart = false, acknowledge = false, modelId } = {}) => {
      const session = captureSession()
      const originalModel = materialModels.get(material.id) || job?.model_id || modelId
      if (!originalModel)
        throw new Error(
          '처음 분석에 사용한 모델을 확인해 주세요. 현재 선택한 모델을 임의로 사용하지 않아요.',
        )
      if (restart && !acknowledge)
        throw new Error('중복 비용 가능성에 동의한 뒤 다시 시작할 수 있어요.')
      const operationId = `${job.id}:${job.attempt_no}:${restart ? 'restart' : 'retry'}`
      let key = recoveries.get(operationId)
      if (!key) {
        key = createIdempotencyKey()
        recoveries.set(operationId, key)
      }
      const options = { idempotencyKey: key, modelId: originalModel }
      const accepted = restart
        ? await restartJob(job.id, { acknowledge_possible_duplicate_cost: true }, options)
        : await retryJob(job.id, options)
      assertSession(session)
      materialModels.set(material.id, originalModel)
      return accepted
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material', material?.id] })
      qc.invalidateQueries({ queryKey: ['materials'] })
      qc.invalidateQueries({ queryKey: ['material-job'] })
    },
    retry: false,
  })
  return { ...mutation, modelId: materialModels.get(material?.id) || job?.model_id }
}
