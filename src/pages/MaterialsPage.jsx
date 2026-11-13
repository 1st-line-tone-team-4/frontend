import { useState } from 'react'
import { Link } from 'react-router-dom'
import iconFile from '@/assets/icons/file-lg.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheck14 from '@/assets/icons/check-primary-14b.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconLock from '@/assets/icons/lock-sm.svg'
import { USE_MOCK } from '@/api/client'
import { getMaterialSource } from '@/api/study'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'
import Source from '@/components/Source'
import {
  useArchiveMaterial,
  useConcepts,
  useConceptVersions,
  useDday,
  useDeleteMaterial,
  useExamGoals,
  useMaterials,
  useUnits,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { formatBytes, pageRange } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY = {
  headerLine: '토익 정기시험 · 자료 1개',
  file: {
    name: '토익 문법 정리.pdf',
    meta: '32페이지 · 2.4 MB · 11월 3일 업로드',
    statusLabel: '업로드 완료',
    conceptChip: '개념 8개 확정',
  },
  concepts: [
    {
      title: '시제의 기초 · 개념 4개',
      chip: '체크리스트 4개 · 확정',
      lines: ['현재시제 · 과거시제', '미래시제 · 주어와 동사의 수 일치'],
      pages: 'p.20–23',
    },
    {
      title: '현재완료 · 개념 4개',
      chip: '체크리스트 12개 · 확정',
      lines: ['현재완료의 형태 · since와 for', '계속 용법 · 과거 시점 부사'],
      pages: 'p.24–25',
      checklist: [
        '현재완료의 형태를 설명할 수 있다',
        'since와 for를 구분할 수 있다',
        '과거시제와의 차이를 설명한다',
      ],
      more: '확인 항목 12개 모두 보기',
    },
  ],
}

const STATUS_LABEL = {
  upload_pending: '업로드 중',
  queued: '분석 대기',
  processing: '분석 중',
  ready: '업로드 완료',
  failed: '분석 실패',
}

// API(자료 + 단원 + 개념) → 화면 데이터
function toView(material, materialCount, goal, units = [], concepts = []) {
  const created = new Date(material.created_at)
  const confirmed = concepts.filter((c) => c.current_version.is_confirmed)
  const unitCards = [...units]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((u) => {
      const unitConcepts = concepts.filter((c) => c.unit_id === u.id)
      const list = unitConcepts.map((c) => c.current_version)
      if (list.length === 0) return null
      const checklist = list.flatMap((v) => v.checklist_items.map((k) => k.criterion))
      const names = list.map((v) => v.name)
      const half = Math.ceil(names.length / 2)
      return {
        title: `${u.title} · 개념 ${list.length}개`,
        chip: `체크리스트 ${checklist.length}개 · ${list.every((v) => v.is_confirmed) ? '확정' : '검토 전'}`,
        lines: [names.slice(0, half).join(' · '), names.slice(half).join(' · ')],
        pages: pageRange(list.flatMap((v) => v.evidence)),
        checklist: checklist.slice(0, 3),
        more: checklist.length > 3 ? `확인 항목 ${checklist.length}개 모두 보기` : null,
        conceptRefs: unitConcepts.map((c) => ({ id: c.concept_id, name: c.current_version.name })),
      }
    })
    .filter(Boolean)

  return {
    headerLine: [goal?.title, `자료 ${materialCount}개`].filter(Boolean).join(' · '),
    file: {
      name: material.filename,
      meta: [
        material.page_count && `${material.page_count}페이지`,
        formatBytes(material.size_bytes),
        `${created.getMonth() + 1}월 ${created.getDate()}일 업로드`,
      ]
        .filter(Boolean)
        .join(' · '),
      statusLabel: STATUS_LABEL[material.processing_status],
      conceptChip: confirmed.length ? `개념 ${confirmed.length}개 확정` : null,
    },
    concepts: unitCards,
  }
}

// 13 내 자료
export default function MaterialsPage() {
  const dday = useDday()
  const { materialId, materialIds, examGoalId, setIds } = useStudyStore()
  const materials = useMaterials()
  const goals = useExamGoals()
  // 지금 학습 중인 자료, 없으면 가장 최근 자료
  const material =
    materials.data?.items.find((m) => m.id === materialId) ?? materials.data?.items[0]
  const units = useUnits(material?.id)
  const concepts = useConcepts(material?.id)
  const remove = useDeleteMaterial()
  const archive = useArchiveMaterial()
  const [menuOpen, setMenuOpen] = useState(false)

  const goal = goals.data?.items.find((g) => g.id === examGoalId) ?? goals.data?.items[0]
  const view = USE_MOCK
    ? DUMMY
    : material
      ? toView(material, materials.data.items.length, goal, units.data, concepts.data)
      : null

  if (!view) {
    return (
      <Screen header="app" tabs>
        <ApiState
          query={materials}
          empty="아직 올린 자료가 없어요."
          action={{ label: '자료 추가하기', to: '/upload' }}
        />
      </Screen>
    )
  }

  const openSource = async () => {
    if (USE_MOCK) return
    try {
      const { url } = await getMaterialSource(material.id, 1)
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      alert(err.message)
    }
  }

  const onArchive = () => {
    if (USE_MOCK) return setMenuOpen(false)
    archive.mutate({ id: material.id, archived: true }, { onError: (err) => alert(err.message) })
    setMenuOpen(false)
  }

  const onDelete = () => {
    if (!window.confirm('이 자료를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setMenuOpen(false)
    if (USE_MOCK) return
    remove.mutate(material.id, {
      onSuccess: () =>
        setIds({
          materialId: material.id === materialId ? null : materialId,
          materialIds: materialIds.filter((id) => id !== material.id),
        }),
      // 학습 기록이 연결된 자료는 409 → 보관만 가능
      onError: (err) =>
        alert(
          err.status === 409
            ? '학습 기록이 연결된 자료라 삭제할 수 없어요. 보관은 할 수 있어요.'
            : err.message,
        ),
    })
  }

  const actions = [
    { label: '원본 보기', onClick: openSource },
    { label: '개념 다시 확인', to: '/concepts' },
    { label: '더 보기', onClick: () => setMenuOpen((v) => !v) },
  ]

  return (
    <Screen header="app" tabs className="gap-2.5">
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px]">
          내 공부의 근거, 내 자료
        </h1>
        <div className="flex items-center gap-2">
          {dday && <Chip>{dday}</Chip>}
          <p className="text-sm leading-[1.4] text-sub">{view.headerLine}</p>
        </div>
      </div>

      <Card className="gap-2.5 rounded-[18px] border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white">
            <img src={iconFile} alt="" className="size-[21.12px]" />
          </span>
          <div className="flex flex-col gap-[2px] leading-[1.4]">
            <p className="text-base font-bold tracking-[-0.16px]">{view.file.name}</p>
            <p className="text-xs text-sub">{view.file.meta}</p>
          </div>
        </div>
        <div className="flex gap-[6px]">
          <Chip tone="white" className="text-primary">
            <img src={iconCheck} alt="" className="size-[11px]" />
            {view.file.statusLabel}
          </Chip>
          {view.file.conceptChip && (
            <Chip tone="white" className="text-primary">
              {view.file.conceptChip}
            </Chip>
          )}
        </div>
        <div className="flex items-center pt-1">
          {actions.map((a, i) => (
            <div key={a.label} className="flex flex-1 items-center">
              {i > 0 && <span className="h-3 w-px bg-line" />}
              {a.to ? (
                <Link
                  to={a.to}
                  className="flex-1 py-1 text-center text-[13px] leading-[1.3] font-bold text-primary"
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={a.onClick}
                  className="flex-1 py-1 text-center text-[13px] leading-[1.3] font-bold text-primary"
                >
                  {a.label}
                </button>
              )}
            </div>
          ))}
        </div>
        {menuOpen && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onArchive}
              className="flex-1 rounded-xl bg-white py-2 text-[13px] font-bold text-sub"
            >
              보관하기
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 rounded-xl bg-white py-2 text-[13px] font-bold text-error"
            >
              삭제하기
            </button>
          </div>
        )}
      </Card>

      <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">
        이 자료에서 공부하는 개념
      </h2>
      {view.concepts.map((c) => (
        <Card key={c.title} className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">{c.title}</p>
            <Chip>{c.chip}</Chip>
          </div>
          <p className="text-[13px] leading-[1.55] text-sub">
            {c.lines[0]}
            {c.lines[1] && (
              <>
                <br />
                {c.lines[1]}
              </>
            )}
          </p>
          <Source>
            {view.file.name} {c.pages}
          </Source>
          {c.checklist?.length > 0 && (
            <ul className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-3">
              {c.checklist.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 text-[13px] leading-[1.4] font-medium"
                >
                  <img src={iconCheck14} alt="" className="size-[14px]" />
                  {t}
                </li>
              ))}
            </ul>
          )}
          {c.more && (
            <Link
              to="/concepts"
              className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary"
            >
              {c.more}
              <img src={iconRight} alt="" className="size-[14px]" />
            </Link>
          )}
          {!USE_MOCK && c.conceptRefs?.length > 0 && (
            <VersionHistory materialId={material.id} concepts={c.conceptRefs} />
          )}
        </Card>
      ))}

      <p className="flex items-center gap-[6px] text-xs leading-[1.3] text-muted">
        <img src={iconLock} alt="" className="size-[13px]" />
        자료와 근거 페이지는 나만 볼 수 있어요.
      </p>
      <Button to="/upload">자료 추가하기</Button>
    </Screen>
  )
}

// 개념 버전 기록 (GET /materials/{id}/concepts/{conceptId}/versions)
function VersionHistory({ materialId, concepts }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-start text-[13px] leading-[1.4] font-bold text-sub underline"
      >
        {open ? '버전 기록 접기' : '개념 버전 기록 보기'}
      </button>
      {open &&
        concepts.map((c) => <ConceptVersions key={c.id} materialId={materialId} concept={c} />)}
    </div>
  )
}

function ConceptVersions({ materialId, concept }) {
  const versions = useConceptVersions(materialId, concept.id)
  const list = [...(versions.data ?? [])].sort((a, b) => b.version_no - a.version_no)
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-cool px-4 py-3">
      <p className="text-[13px] leading-[1.4] font-bold">{concept.name}</p>
      {versions.isLoading && <p className="text-xs text-muted">불러오는 중이에요…</p>}
      {list.map((v) => (
        <p key={v.id} className="flex items-center gap-2 text-xs leading-[1.4] text-sub">
          <span className="font-bold text-ink">v{v.version_no}</span>
          <span className="flex-1 truncate">{v.name}</span>
          <span>{v.is_confirmed ? '확정' : '초안'}</span>
        </p>
      ))}
    </div>
  )
}
