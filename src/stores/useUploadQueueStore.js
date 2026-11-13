import { create } from 'zustand'
import { newIdempotencyKey } from '@/api/client'
import {
  completeMaterial,
  fetchMaterialPageCount,
  isCanceled,
  pollJob,
  retryMaterialJob,
  uploadMaterialFile,
} from '@/api/materialUpload'
import { useStudyStore } from '@/stores/useStudyStore'
import { countPages, validateFiles } from '@/utils/materialFiles'

/**
 * 자료 여러 개 업로드 큐 (File 객체를 들고 있어서 새로고침 시 유지하지 않아요)
 * 화면 밖(스토어)에서 실행되므로 /upload → /upload/exam 으로 이동해도 업로드가 이어져요
 *
 * item.status
 *  idle      선택만 함 (업로드하기 전)
 *  waiting   업로드 순서 대기
 *  uploading 업로드 URL 발급 · 파일 전송 · 분석 요청 중 (동시 MAX_CONCURRENT 개)
 *  analyzing 분석 job 폴링 중 (동시 업로드 수에 포함하지 않아요)
 *  succeeded 분석 완료
 *  failed    실패 (error.message 에 사유)
 */
export const MAX_CONCURRENT = 3
const MAX_JOB_ATTEMPTS = 3

export const ACTIVE_STATUSES = ['waiting', 'uploading', 'analyzing']

// 진행 중인 요청 취소용 (상태에 넣지 않고 따로 보관)
const controllers = new Map()

// job 실패 · retryable · 3회 미만일 때만 재시도 가능
export const canRetryItem = (item) =>
  item.status === 'failed' &&
  item.job?.status === 'failed' &&
  item.job.retryable === true &&
  (item.job.attempt_no ?? 1) < MAX_JOB_ATTEMPTS

const jobErrorMessage = (job) =>
  job?.error_message ?? job?.error?.message ?? 'AI 분석에 실패했어요.'

export const useUploadQueueStore = create((set, get) => {
  const patch = (id, changes) =>
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...changes } : it)) }))
  const find = (id) => get().items.find((it) => it.id === id)

  // 완료된 자료 ID 를 학습 흐름 스토어로 (다음 단계 study-plans material_ids)
  const syncStudyIds = (removedMaterialId) => {
    const ids = get()
      .items.filter((it) => it.status === 'succeeded')
      .map((it) => it.materialId)
    const { materialId } = useStudyStore.getState()
    const nextMaterialId = ids.includes(materialId)
      ? materialId
      : (ids[0] ?? (materialId === removedMaterialId ? null : materialId))
    useStudyStore.getState().setIds({ materialIds: ids, materialId: nextMaterialId })
  }

  const fail = (id, err) => {
    if (isCanceled(err)) return // 목록에서 삭제됨
    patch(id, { status: 'failed', error: { message: err?.message ?? '업로드에 실패했어요.' } })
  }

  const begin = (id) => {
    const controller = new AbortController()
    controllers.set(id, controller)
    return controller
  }
  const end = (id, controller) => {
    if (controllers.get(id) === controller) controllers.delete(id)
  }

  // d · 분석 완료까지 기다린 뒤 결과 반영
  const watchJob = async (id, job, signal) => {
    const final = await pollJob(job, { signal, onUpdate: (j) => patch(id, { job: j }) })
    if (final.status !== 'succeeded') {
      patch(id, { status: 'failed', job: final, error: { message: jobErrorMessage(final) } })
      return
    }
    const item = find(id)
    const pages = item?.pages ?? (await fetchMaterialPageCount(item?.materialId))
    if (signal.aborted) return
    patch(id, { status: 'succeeded', job: final, pages, error: null })
    syncStudyIds()
  }

  // a ~ d · 파일 하나 처리 (실패해도 다른 파일에는 영향 없음)
  const run = async (id) => {
    const item = find(id)
    if (!item) return
    const controller = begin(id)
    const { signal } = controller
    patch(id, { status: 'uploading', error: null })
    try {
      const material = await uploadMaterialFile(item.file, item.mime, {
        signal,
        onMaterial: (m) => patch(id, { materialId: m.id }),
      })
      const job = await completeMaterial(material, {
        idempotencyKey: newIdempotencyKey(),
        signal,
      })
      patch(id, { status: 'analyzing', job })
      pump() // 전송이 끝났으니 다음 파일 업로드 시작
      await watchJob(id, job, signal)
    } catch (err) {
      fail(id, err)
    } finally {
      end(id, controller)
      pump()
    }
  }

  // 동시 업로드 수 제한 안에서 대기 중인 파일 시작
  const pump = () => {
    const { items } = get()
    let free = MAX_CONCURRENT - items.filter((it) => it.status === 'uploading').length
    for (const it of items) {
      if (free <= 0) break
      if (it.status !== 'waiting') continue
      free -= 1
      patch(it.id, { status: 'uploading' })
      void run(it.id)
    }
  }

  return {
    items: [],

    /**
     * 파일 추가 · 검증에 걸린 파일만 빼고 추가
     * @param {FileList|File[]} fileList
     * @param {{ start?: boolean }} options start=true 면 바로 업로드 시작
     * @returns {{ name: string, reason: string }[]} 제외된 파일과 이유
     */
    addFiles: (fileList, { start = false } = {}) => {
      const { accepted, rejected } = validateFiles([...fileList], get().items)
      const added = accepted.map(({ file, key, mime }) => ({
        id: newIdempotencyKey(),
        key,
        file,
        mime,
        name: file.name,
        size: file.size,
        pages: null,
        pagesStatus: 'counting', // counting | done | error
        status: start ? 'waiting' : 'idle',
        materialId: null,
        job: null,
        error: null,
      }))
      set((s) => ({ items: [...s.items, ...added] }))

      // 하루 권장 학습량 계산용 페이지 수 (업로드와 별개로 계산)
      added.forEach(async ({ id, file, mime }) => {
        try {
          const pages = await countPages(file, mime)
          if (find(id)) patch(id, { pages: find(id).pages ?? pages, pagesStatus: 'done' })
        } catch (error) {
          console.error('Page count failed:', error)
          patch(id, { pagesStatus: 'error' })
        }
      })

      if (start) pump()
      return rejected
    },

    // 선택만 해 둔 파일들 업로드 시작
    startAll: () => {
      set((s) => ({
        items: s.items.map((it) => (it.status === 'idle' ? { ...it, status: 'waiting' } : it)),
      }))
      pump()
    },

    // 목록에서 삭제 · 진행 중이면 요청만 취소 (이미 만들어진 material 은 건드리지 않아요)
    remove: (id) => {
      const item = find(id)
      if (!item) return
      controllers.get(id)?.abort()
      controllers.delete(id)
      set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
      if (item.status === 'succeeded') syncStudyIds(item.materialId)
      pump()
    },

    // 실패한 분석 job 재시도 (POST /jobs/{id}/retry)
    retry: async (id) => {
      const item = find(id)
      if (!item || !canRetryItem(item)) return
      const controller = begin(id)
      const { signal } = controller
      patch(id, { status: 'analyzing', error: null })
      try {
        const job = await retryMaterialJob(item.job.id, { signal })
        const next = { ...item.job, ...job, id: job?.id ?? item.job.id }
        patch(id, { job: next })
        await watchJob(id, next, signal)
      } catch (err) {
        if (!isCanceled(err)) patch(id, { job: item.job }) // 재시도 요청 자체가 실패 → 이전 job 기준 유지
        fail(id, err)
      } finally {
        end(id, controller)
      }
    },

    // 모두 비우기 (진행 중 요청 취소)
    clear: () => {
      controllers.forEach((c) => c.abort())
      controllers.clear()
      set({ items: [] })
    },
  }
})
