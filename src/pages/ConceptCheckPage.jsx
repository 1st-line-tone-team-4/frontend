import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import iconPen from '@/assets/icons/pen.svg'
import iconTrash from '@/assets/icons/trash.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconPlus from '@/assets/icons/plus.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card, { Divider } from '@/components/Card'
import Checkbox from '@/components/Checkbox'
import Chip from '@/components/Chip'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import { useConfirmConceptsAndPlan } from '@/hooks/useStudyApi'
import * as Api from '@/api/study'
import { useStudyStore } from '@/stores/useStudyStore'
import { pageRange } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY = {
  fileName: '토익 문법 정리.pdf',
  desc: '8개 개념 · 확인 항목 16개를 추출했어요.',
  units: [
    {
      id: 'u1',
      title: '시제의 기초',
      count: 4,
      lines: ['현재시제 · 과거시제', '미래시제 · 주어와 동사의 수 일치'],
      pages: 'p.20–23',
    },
    { id: 'u2', title: '현재완료', note: '확인 항목: 형태 · 기간 표현 · 예문 설명' },
  ],
  concepts: [
    { id: 'c1', unitId: 'u2', text: '현재완료의 형태', page: 'p.24', checked: true },
    { id: 'c2', unitId: 'u2', text: 'since와 for', page: 'p.24', checked: true },
    { id: 'c3', unitId: 'u2', text: '현재완료의 계속 용법', page: 'p.25', checked: true },
    { id: 'c4', unitId: 'u2', text: '과거 시점 부사와의 구분', page: 'p.25', checked: true },
  ],
  criteria: [
    { id: 'k1', text: '현재완료의 형태를 설명한다', page: 'p.24', checked: true },
    { id: 'k2', text: 'since와 for를 구분한다', page: 'p.24', checked: true },
    { id: 'k3', text: '과거시제와의 차이를 설명한다', page: 'p.25', checked: true },
  ],
  criteriaSub: '시제의 기초 4개 · 현재완료 12개',
  criteriaTotal: 16,
}

// API 응답(단원 + 개념) → 화면 데이터
function toView(material, units, concepts) {
  const sorted = [...units].sort((a, b) => a.ordinal - b.ordinal)
  const conceptItems = concepts.map((c) => ({
    id: c.concept_id,
    materialId: material.id,
    unitId: c.unit_id,
    text: c.current_version.name,
    page: pageRange(c.current_version.evidence),
    checked: true,
  }))
  const criteria = concepts.flatMap((c) =>
    c.current_version.checklist_items
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((k) => ({
        id: k.id,
        materialId: material.id,
        conceptId: c.concept_id,
        text: k.criterion,
        page: pageRange(c.current_version.evidence),
        checked: true,
      })),
  )
  return {
    fileName: material?.filename ?? '',
    desc: `${concepts.length}개 개념 · 확인 항목 ${criteria.length}개를 추출했어요.`,
    units: sorted
      .map((u) => ({ id: u.id, materialId: material.id, title: u.title }))
      .filter((u) => conceptItems.some((c) => c.unitId === u.id)),
    concepts: conceptItems,
    criteria,
    criteriaSub: sorted
      .map((u) => {
        const ids = concepts.filter((c) => c.unit_id === u.id).map((c) => c.concept_id)
        const n = criteria.filter((k) => ids.includes(k.conceptId)).length
        return n ? `${u.title} ${n}개` : null
      })
      .filter(Boolean)
      .join(' · '),
    criteriaTotal: criteria.length,
  }
}

function ItemRow({ item, fileName, onToggle, onEdit, onDelete }) {
  return (
    <li className="flex items-start gap-[10px] py-1">
      <Checkbox checked={item.checked} onChange={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className="text-sm leading-[1.4] font-medium">{item.text}</p>
        <Source>
          {fileName} {item.page}
        </Source>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="수정" onClick={onEdit}>
          <img src={iconPen} alt="" className="size-4" />
        </button>
        <button type="button" aria-label="삭제" onClick={onDelete}>
          <img src={iconTrash} alt="" className="size-4" />
        </button>
      </div>
    </li>
  )
}

function useItems(initial) {
  const [items, setItems] = useState(initial)
  return {
    items,
    toggle: (id) =>
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x))),
    remove: (id) => setItems((xs) => xs.filter((x) => x.id !== id)),
    edit: (id) => {
      const current = items.find((x) => x.id === id)
      const text = window.prompt('내용을 수정해 주세요', current?.text ?? '')
      if (text?.trim())
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text: text.trim() } : x)))
    },
  }
}

const rowHandlers = (list, it) => ({
  onToggle: () => list.toggle(it.id),
  onEdit: () => list.edit(it.id),
  onDelete: () => list.remove(it.id),
})

// 04 개념 확인
export default function ConceptCheckPage() {
  if (USE_MOCK) return <ConceptCheckView view={DUMMY} />
  return <ConceptCheckLive />
}

function ConceptCheckLive() {
  const materialId = useStudyStore((s) => s.materialId)
  const material = useMaterial(materialId)
  const units = useUnits(materialId)
  const concepts = useConcepts(materialId)
  const header = { title: '개념 확인' }

  if (!materialId) {
    return (
      <Screen header={header}>
        <ApiState
          empty="먼저 자료를 올려 주세요."
          action={{ label: '자료 올리기', to: '/upload' }}
        />
      </Screen>
    )
  }
  const query = concepts.isSuccess ? units : concepts
  if (!units.data || !concepts.data || concepts.data.length === 0) {
    return (
      <Screen header={header}>
        <ApiState query={query} empty={'자료를 분석하고 있어요.\n분석이 끝나면 개념이 보여요.'} />
      </Screen>
    )
  }
  return (
    <ConceptCheckView
      view={toView(material.data, units.data, concepts.data)}
      rawConcepts={concepts.data}
    />
  )
}

function ConceptCheckView({ view, rawConcepts }) {
  const navigate = useNavigate()
  const concepts = useItems(view.concepts)
  const criteria = useItems(view.criteria)
  const [expanded, setExpanded] = useState(false)
  const { materialId, materialIds, examGoalId } = useStudyStore()
  const confirm = useConfirmConceptsAndPlan()

  const onConfirm = () => {
    if (USE_MOCK) return navigate('/today')
    if (!examGoalId) return alert('시험 정보를 먼저 입력해 주세요.')

    // 체크한 개념만 확정 · 개념의 확인 항목은 체크한 것만 평가 기준으로 보냄
    const payload = rawConcepts
      .filter((c) => concepts.items.some((x) => x.id === c.concept_id && x.checked))
      .map((c) => {
        const v = c.current_version
        const name = concepts.items.find((x) => x.id === c.concept_id).text
        return {
          concept_id: c.concept_id,
          unit_id: c.unit_id,
          base_version_id: v.id,
          name,
          summary: v.summary ?? name,
          checklist_items: criteria.items
            .filter((k) => k.conceptId === c.concept_id && k.checked)
            .map((k) => k.text),
          evidence_chunk_ids: v.evidence.map((e) => e.chunk_id),
        }
      })
    if (payload.length === 0) return alert('공부할 개념을 1개 이상 선택해 주세요.')
    const empty = payload.find((p) => p.checklist_items.length === 0)
    if (empty) return alert(`'${empty.name}'의 확인 항목을 1개 이상 남겨 주세요.`)

    confirm.mutate(
      { materialId, materialIds, examGoalId, concepts: payload },
      { onSuccess: () => navigate('/today'), onError: (err) => alert(err.message) },
    )
  }

  const visibleCriteria = expanded ? criteria.items : criteria.items.slice(0, 3)

  return (
    <Screen
      header={{ title: '개념 확인' }}
      bottom={
        <>
          <BottomNote>
            모든 개념은 처음부터 학습해요.
            <br />
            확정한 항목을 기준으로 설명을 평가해요.
          </BottomNote>
          <Button onClick={onConfirm} disabled={confirm.isPending}>
            {confirm.isPending ? '코스를 만드는 중이에요…' : '확정하고 코스 만들기'}
          </Button>
        </>
      }
    >
      <PageTitle title="공부할 개념을 확인해 주세요" desc={view.desc} />

      {view.units.map((u) => {
        const unitConcepts = concepts.items.filter((c) => c.unitId === u.id)
        return (
          <Card key={u.id}>
            <div className="flex items-center justify-between">
              <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">{u.title}</p>
              <Chip>개념 {u.count ?? unitConcepts.length}개</Chip>
            </div>
            {u.lines ? (
              <>
                <p className="text-sm leading-[1.55] text-sub">
                  {u.lines[0]}
                  <br />
                  {u.lines[1]}
                </p>
                <Source>
                  {view.fileName} {u.pages}
                </Source>
              </>
            ) : (
              <ul className="flex flex-col gap-[10px]">
                {unitConcepts.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    fileName={view.fileName}
                    {...rowHandlers(concepts, it)}
                  />
                ))}
              </ul>
            )}
            {u.note && (
              <>
                <Divider />
                <p className="text-xs leading-[1.4] font-medium text-sub">{u.note}</p>
              </>
            )}
          </Card>
        )
      })}

      <Card tone="cool">
        <div className="flex flex-col gap-[2px] leading-[1.4]">
          <p className="text-base font-bold tracking-[-0.16px]">설명 평가에 쓸 확인 항목</p>
          <p className="text-xs text-sub">{view.criteriaSub}</p>
        </div>
        <ul className="flex flex-col gap-[10px]">
          {visibleCriteria.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              fileName={view.fileName}
              {...rowHandlers(criteria, it)}
            />
          ))}
        </ul>
        {view.criteriaTotal > 3 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary"
          >
            확인 항목 {view.criteriaTotal}개 모두 보기
            <img src={iconRight} alt="" className="size-[14px]" />
          </button>
        )}
      </Card>

      <button
        type="button"
        className="flex items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-primary py-[14px] text-sm leading-[1.3] font-bold text-primary"
      >
        <img src={iconPlus} alt="" className="size-4" />
        개념·확인 항목 추가
      </button>
    </Screen>
  )
}
