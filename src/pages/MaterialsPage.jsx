import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import iconFile from '@/assets/icons/file-lg.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheck14 from '@/assets/icons/check-primary-14b.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconLock from '@/assets/icons/lock-sm.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'
import Source from '@/components/Source'
import {
  useArchiveMaterial,
  useConcepts,
  useDday,
  useDeleteMaterial,
  useExamGoals,
  useMaterials,
  useMaterial,
  useUnits,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { formatBytes, pageRange } from '@/utils/format'
import MaterialRecovery from '@/components/MaterialRecovery'

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
      const list = concepts.filter((c) => c.unit_id === u.id).map((c) => c.current_version)
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
  const navigate = useNavigate()
  const dday = useDday()
  const { materialId, examGoalId, setIds } = useStudyStore()
  const materials = useMaterials({ include_archived: true })
  const goals = useExamGoals()
  // 지금 학습 중인 자료, 없으면 가장 최근 자료
  const listedMaterial =
    materials.data?.items.find((m) => m.id === materialId) ?? materials.data?.items[0]
  const detail = useMaterial(listedMaterial?.id)
  const material = detail.data ?? listedMaterial
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

  const openSource = () => {
    if (USE_MOCK) return
    navigate(`/source?materialId=${material.id}&page=1&plain=1`)
  }

  const onArchive = () => {
    if (USE_MOCK) return setMenuOpen(false)
    if (archive.isPending) return
    archive.mutate(
      { id: material.id, archived: !material.archived },
      { onError: (err) => alert(err.message) },
    )
    setMenuOpen(false)
  }

  const onDelete = () => {
    if (remove.isPending) return
    if (!window.confirm('이 자료를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setMenuOpen(false)
    if (USE_MOCK) return
    remove.mutate(material.id, {
      onSuccess: () => material.id === materialId && setIds({ materialId: null }),
      // 학습 기록이 연결된 자료는 409 → 보관만 가능
      onError: (err) =>
        alert(
          err.status === 409
            ? '분석 작업이 진행 중이거나 학습 기록이 연결된 자료라 삭제할 수 없어요. 보관은 할 수 있어요.'
            : err.message,
        ),
    })
  }

  const actions = [
    { label: '원본 보기', onClick: openSource },
    {
      label: '개념 다시 확인',
      onClick: () => {
        if (!USE_MOCK && (material.archived || material.processing_status !== 'ready'))
          return alert('분석이 완료된 보관되지 않은 자료만 개념을 확인할 수 있어요.')
        if (!USE_MOCK) setIds({ materialId: material.id })
        navigate('/concepts')
      },
    },
    { label: '더 보기', onClick: () => setMenuOpen((v) => !v) },
  ]

  return (
    <Screen header="app" tabs className="gap-[18px]">
      {!USE_MOCK && materials.data?.items.length > 0 && (
        <label className="flex flex-col gap-2 text-sm">
          자료 선택 (보관된 자료 포함)
          <select
            value={material.id}
            onChange={(e) => setIds({ materialId: e.target.value })}
            className="rounded-xl border border-line p-3"
          >
            {materials.data.items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.archived ? '[보관] ' : ''}
                {m.filename}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px]">
          내 공부의 근거, 내 자료
        </h1>
        <div className="flex items-center gap-2">
          {dday && <Chip>{dday}</Chip>}
          <p className="text-sm leading-[1.4] text-sub">{view.headerLine}</p>
        </div>
      </div>

      <Card tone="gradient" className="gap-3 rounded-[18px] px-[18px] pt-[18px] pb-4">
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
              disabled={archive.isPending || remove.isPending}
              className="flex-1 rounded-xl bg-white py-2 text-[13px] font-bold text-sub"
            >
              {material?.archived ? '보관 해제하기' : '보관하기'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={archive.isPending || remove.isPending}
              className="flex-1 rounded-xl bg-white py-2 text-[13px] font-bold text-error"
            >
              삭제하기
            </button>
          </div>
        )}
      </Card>
      {!USE_MOCK && <MaterialRecovery material={material} />}
      {!USE_MOCK && material?.processing_status === 'upload_pending' && (
        <div className="rounded-xl bg-cool p-3 text-sm">
          <p>파일 전송 또는 분석 시작이 아직 확인되지 않은 자료예요.</p>
          <p className="mt-2 text-xs text-sub">
            같은 브라우저 화면에서는 업로드 페이지에서 이어서 확인할 수 있어요. 새로고침으로 대기
            정보가 사라졌다면 잠시 후 상태를 다시 확인해 주세요. 계속 미완료라면 삭제 후 다시
            업로드할 수 있어요. 진행 중인 분석은 서버가 삭제를 차단해요.
          </p>
          <Button variant="secondary" to="/upload">
            업로드 상태 확인
          </Button>
        </div>
      )}

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
