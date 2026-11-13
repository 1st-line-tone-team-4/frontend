import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import iconPen from '@/assets/icons/pen.svg'
import iconTrash from '@/assets/icons/trash.svg'
import iconPlus from '@/assets/icons/plus.svg'
import { USE_MOCK } from '@/api/client'
import * as Api from '@/api/study'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import { useStudyStore } from '@/stores/useStudyStore'
import { pageRange } from '@/utils/format'

/**
 * 04 개념 확인 (swagger v1.4.0)
 * - GET  /materials/{id}            분석 상태 (ready 가 아니면 개념이 비어 있어요)
 * - GET  /materials/{id}/units      단원
 * - GET  /materials/{id}/concepts   개념 + current_version (draft 또는 confirmed)
 * - PATCH /materials/{id}/concepts  자료별 일괄 확정 (draft 이거나 고친 개념만)
 * - POST /study-plans               { exam_goal_id, material_ids }
 *
 * 명세상 개념을 빼거나 지우는 API 가 없고, draft 개념이 하나라도 남으면 계획 생성이 422 라서
 * 모든 개념을 확정해요. 대신 개념 이름 · 요약 · 확인 항목(1~50개)은 고칠 수 있어요.
 */
const LIMIT = { name: 200, summary: 12000, criterion: 2000, checklist: 50 }
const PROCESSING = ['upload_pending', 'queued', 'processing']

// 목 모드용 더미 (API 응답과 같은 모양)
const ev = (page) => [
  { chunk_id: `chunk-${page}`, material_id: 'mock', material_name: '토익 문법 정리.pdf', page_number: page, excerpt: '' },
]
const mockVersion = (id, name, summary, criteria, page) => ({
  id: `${id}-v1`,
  version_no: 1,
  name,
  summary,
  is_confirmed: false,
  is_current: true,
  confirmed_at: null,
  checklist_items: criteria.map((criterion, i) => ({ id: `${id}-k${i}`, ordinal: i + 1, criterion })),
  evidence: ev(page),
})
const MOCK = [
  {
    material: { id: 'mock', filename: '토익 문법 정리.pdf', processing_status: 'ready' },
    units: [
      { id: 'u1', material_id: 'mock', ordinal: 1, title: '시제의 기초' },
      { id: 'u2', material_id: 'mock', ordinal: 2, title: '현재완료' },
    ],
    concepts: [
      { concept_id: 'c1', unit_id: 'u1', current_version: mockVersion('c1', '현재시제', '반복되는 일과 사실을 나타내요.', ['현재시제의 쓰임을 설명한다'], 20) },
      { concept_id: 'c2', unit_id: 'u2', current_version: mockVersion('c2', '현재완료의 형태', 'have/has + p.p. 형태예요.', ['현재완료의 형태를 설명한다', '과거시제와의 차이를 설명한다'], 24) },
      { concept_id: 'c3', unit_id: 'u2', current_version: mockVersion('c3', 'since와 for', null, ['since와 for를 구분한다'], 24) },
    ],
  },
]

// 개념의 편집 초안 (처음엔 current_version 값)
const initialDraft = (v) => ({
  name: v.name,
  summary: v.summary ?? '',
  checklist: [...v.checklist_items].sort((a, b) => a.ordinal - b.ordinal).map((k) => k.criterion),
  dirty: false,
})

// 자료별 { material, units, concepts } 불러오기 · 분석 중이면 3초마다 상태 확인
function useBundles(materialIds) {
  const materials = useQueries({
    queries: materialIds.map((id) => ({
      queryKey: ['material', id],
      queryFn: () => Api.getMaterial(id),
      enabled: !USE_MOCK,
      refetchInterval: (q) => (PROCESSING.includes(q.state.data?.processing_status) ? 3000 : false),
    })),
  })
  const ready = (i) => materials[i].data?.processing_status === 'ready'
  const units = useQueries({
    queries: materialIds.map((id, i) => ({
      queryKey: ['units', id],
      queryFn: () => Api.listUnits(id),
      enabled: !USE_MOCK && ready(i),
    })),
  })
  const concepts = useQueries({
    queries: materialIds.map((id, i) => ({
      queryKey: ['concepts', id],
      queryFn: () => Api.listConcepts(id),
      enabled: !USE_MOCK && ready(i),
    })),
  })
  const all = [...materials, ...units, ...concepts]
  return {
    bundles: materialIds.map((id, i) => ({
      id,
      material: materials[i].data,
      units: units[i].data,
      concepts: concepts[i].data,
    })),
    error: all.find((q) => q.isError)?.error,
    isLoading: materials.some((q) => q.isLoading),
    refetch: () => all.forEach((q) => q.refetch()),
  }
}

// 고친 · draft 개념만 자료별로 확정 → 학습 계획 생성
function useConfirmAndPlan() {
  const qc = useQueryClient()
  const setIds = useStudyStore((s) => s.setIds)
  return useMutation({
    mutationFn: async ({ examGoalId, materialIds, byMaterial }) => {
      for (const id of materialIds) {
        if (byMaterial[id]?.length) await Api.confirmConcepts(id, byMaterial[id])
      }
      return Api.createStudyPlan({ exam_goal_id: examGoalId, material_ids: materialIds })
    },
    onSuccess: (plan) => {
      setIds({ planId: plan.id })
      qc.invalidateQueries({ queryKey: ['concepts'] })
      qc.invalidateQueries({ queryKey: ['plan'] })
      qc.invalidateQueries({ queryKey: ['today'] })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['concepts'] }),
  })
}

export default function ConceptCheckPage() {
  const navigate = useNavigate()
  const { materialId, materialIds: storedIds, examGoalId } = useStudyStore()
  // 이번 시험 자료 (최대 20개) · 예전 흐름처럼 materialId 하나만 있어도 동작
  const materialIds = USE_MOCK ? ['mock'] : storedIds?.length ? storedIds : materialId ? [materialId] : []
  const live = useBundles(USE_MOCK ? [] : materialIds)
  const bundles = USE_MOCK ? MOCK : live.bundles
  const [drafts, setDrafts] = useState({}) // concept_id → 초안
  const confirm = useConfirmAndPlan()
  const header = { title: '개념 확인' }

  if (materialIds.length === 0) {
    return (
      <Screen header={header}>
        <ApiState empty="먼저 자료를 올려 주세요." action={{ label: '자료 올리기', to: '/upload' }} />
      </Screen>
    )
  }
  if (!USE_MOCK && (live.isLoading || live.error)) {
    return (
      <Screen header={header}>
        <ApiState query={{ isLoading: live.isLoading, isError: Boolean(live.error), error: live.error, refetch: live.refetch }} />
      </Screen>
    )
  }

  const waiting = bundles.filter((b) => b.material?.processing_status !== 'ready' || !b.units || !b.concepts)
  const failed = bundles.filter((b) => b.material?.processing_status === 'failed')
  const all = bundles.flatMap((b) => (b.concepts ?? []).map((c) => ({ ...c, materialId: b.id })))
  const draftOf = (c) => drafts[c.concept_id] ?? initialDraft(c.current_version)
  const edit = (c, patch) =>
    setDrafts((d) => ({ ...d, [c.concept_id]: { ...draftOf(c), ...patch, dirty: true } }))
  const pending = all.filter((c) => !c.current_version.is_confirmed || drafts[c.concept_id]?.dirty)
  const criteriaCount = all.reduce((n, c) => n + draftOf(c).checklist.length, 0)

  const onConfirm = () => {
    if (failed.length) return alert('분석에 실패한 자료가 있어요. 내 자료에서 다시 시도하거나 빼 주세요.')
    if (waiting.length) return alert('자료 분석이 끝나면 확정할 수 있어요.')
    if (all.length === 0) return alert('확정할 개념이 없어요.')
    if (USE_MOCK) return navigate('/today')
    if (!examGoalId) return alert('시험 정보를 먼저 입력해 주세요.')

    const byMaterial = {}
    for (const c of pending) {
      const d = draftOf(c)
      const name = d.name.trim()
      const summary = d.summary.trim()
      const checklist = d.checklist.map((t) => t.trim()).filter(Boolean)
      if (!name) return alert('이름이 비어 있는 개념이 있어요.')
      if (!summary) return alert(`'${name}'의 요약을 입력해 주세요. 확정하려면 요약이 필요해요.`)
      if (checklist.length === 0) return alert(`'${name}'의 확인 항목을 1개 이상 남겨 주세요.`)
      const evidence = [...new Set(c.current_version.evidence.map((e) => e.chunk_id))]
      if (evidence.length === 0) return alert(`'${name}'에 근거 페이지가 없어 확정할 수 없어요.`)
      ;(byMaterial[c.materialId] ??= []).push({
        concept_id: c.concept_id,
        unit_id: c.unit_id,
        base_version_id: c.current_version.id, // 현재 버전과 다르면 409 VERSION_CONFLICT
        name,
        summary,
        checklist_items: checklist,
        evidence_chunk_ids: evidence,
      })
    }

    confirm.mutate(
      { examGoalId, materialIds, byMaterial },
      {
        onSuccess: () => navigate('/today'),
        onError: (err) => {
          if (err.code === 'VERSION_CONFLICT') {
            setDrafts({})
            live.refetch()
            return alert('다른 곳에서 개념이 바뀌었어요. 최신 내용으로 다시 불러왔어요.')
          }
          if (err.code === 'ACTIVE_PLAN_EXISTS') {
            alert('이 시험에는 이미 학습 계획이 있어요. 계획 화면에서 일정을 다시 맞춰 주세요.')
            return navigate('/plan')
          }
          alert(err.message)
        },
      },
    )
  }

  return (
    <Screen
      header={header}
      bottom={
        <>
          <BottomNote>
            모든 개념을 확정해야 학습 계획을 만들 수 있어요.
            <br />
            확정한 확인 항목을 기준으로 설명을 평가해요.
          </BottomNote>
          <Button
            onClick={onConfirm}
            variant={waiting.length ? 'disabled' : 'primary'}
            disabled={confirm.isPending}
          >
            {confirm.isPending ? '코스를 만드는 중이에요…' : '확정하고 코스 만들기'}
          </Button>
        </>
      }
    >
      <PageTitle
        title="공부할 개념을 확인해 주세요"
        desc={`${all.length}개 개념 · 확인 항목 ${criteriaCount}개${
          all.length && pending.length < all.length ? ` · 확정됨 ${all.length - pending.length}개` : ''
        }`}
      />

      {waiting.map((b) => (
        <p key={b.id} className="rounded-[14px] bg-cool px-4 py-3 text-[13px] leading-[1.5] text-sub">
          {b.material?.filename ?? '자료'} ·{' '}
          {b.material?.processing_status === 'failed'
            ? '분석에 실패했어요.'
            : '분석하고 있어요. 끝나면 개념이 보여요.'}
        </p>
      ))}

      {bundles.map((b) =>
        [...(b.units ?? [])]
          .sort((x, y) => x.ordinal - y.ordinal)
          .map((u) => {
            const list = (b.concepts ?? []).filter((c) => c.unit_id === u.id)
            if (list.length === 0) return null
            return (
              <Card key={u.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    {bundles.length > 1 && (
                      <p className="truncate text-xs text-sub">{b.material.filename}</p>
                    )}
                    <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">{u.title}</p>
                  </div>
                  <Chip>개념 {list.length}개</Chip>
                </div>
                <ul className="flex flex-col divide-y divide-line">
                  {list.map((c) => (
                    <ConceptItem
                      key={c.concept_id}
                      concept={c}
                      fileName={b.material.filename}
                      draft={draftOf(c)}
                      onChange={(patch) => edit(c, patch)}
                    />
                  ))}
                </ul>
              </Card>
            )
          }),
      )}
    </Screen>
  )
}

const ask = (label, value, max) => {
  const text = window.prompt(`${label}을(를) 입력해 주세요 (최대 ${max}자)`, value)
  return text === null ? null : text.trim().slice(0, max)
}

function ConceptItem({ concept, fileName, draft, onChange }) {
  const v = concept.current_version
  const confirmed = v.is_confirmed && !draft.dirty
  const pages = pageRange(v.evidence)
  const setItem = (i, text) =>
    onChange({ checklist: draft.checklist.map((t, k) => (k === i ? text : t)) })

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="text-[15px] leading-[1.4] font-bold">{draft.name}</p>
          {pages && (
            <Source>
              {fileName} {pages}
            </Source>
          )}
        </div>
        {(confirmed || draft.dirty) && (
          <Chip tone={confirmed ? 'primary' : 'secondary'}>
            {confirmed ? `확정 v${v.version_no}` : '수정함'}
          </Chip>
        )}
        <button
          type="button"
          aria-label="개념 이름 수정"
          onClick={() => {
            const name = ask('개념 이름', draft.name, LIMIT.name)
            if (name) onChange({ name })
          }}
        >
          <img src={iconPen} alt="" className="size-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          const summary = ask('요약', draft.summary, LIMIT.summary)
          if (summary !== null) onChange({ summary })
        }}
        className={`rounded-xl px-3 py-2 text-left text-[13px] leading-[1.55] ${
          draft.summary ? 'bg-cool text-sub' : 'border border-dashed border-error/50 text-error'
        }`}
      >
        {draft.summary || '요약이 비어 있어요. 눌러서 입력해 주세요.'}
      </button>

      <ul className="flex flex-col gap-[6px]">
        {draft.checklist.map((t, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="pt-[1px] text-[13px] font-bold text-primary">✓</span>
            <p className="flex-1 text-[13px] leading-[1.5]">{t}</p>
            <button
              type="button"
              aria-label="확인 항목 수정"
              onClick={() => {
                const text = ask('확인 항목', t, LIMIT.criterion)
                if (text) setItem(i, text)
              }}
            >
              <img src={iconPen} alt="" className="size-[14px]" />
            </button>
            <button
              type="button"
              aria-label="확인 항목 삭제"
              disabled={draft.checklist.length <= 1}
              onClick={() => onChange({ checklist: draft.checklist.filter((_, k) => k !== i) })}
              className="disabled:opacity-30"
            >
              <img src={iconTrash} alt="" className="size-[14px]" />
            </button>
          </li>
        ))}
      </ul>
      {draft.checklist.length < LIMIT.checklist && (
        <button
          type="button"
          onClick={() => {
            const text = ask('확인 항목', '', LIMIT.criterion)
            if (text) onChange({ checklist: [...draft.checklist, text] })
          }}
          className="flex items-center gap-1 self-start text-[13px] font-bold text-primary"
        >
          <img src={iconPlus} alt="" className="size-[14px]" />
          확인 항목 추가
        </button>
      )}
    </li>
  )
}
