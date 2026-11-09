import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import iconLock from '@/assets/icons/lock.svg'
import iconShare from '@/assets/icons/share.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Segment, Select } from '@/components/Field'
import { XIcon } from '@/components/icons'
import { CONCEPTS } from '@/data/flow'
import Screen, { PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import Toggle from '@/components/Toggle'
import {
  useConcepts,
  useCreateQuestionSet,
  useDday,
  useMaterial,
  useToday,
  useUnits,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { pageRange } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY_UNITS = [
  { id: 'u2', title: '현재완료', source: '토익 문법 정리.pdf · p.24–25' },
  { id: 'u1', title: '시제의 기초', source: '토익 문법 정리.pdf · p.20–23' },
]

// 난이도는 상 · 중 · 하 혼합 고정 (비율은 제안값)
const MIX = {
  basic: [
    ['하', 30, 'bg-primary/35'],
    ['중', 40, 'bg-primary/65'],
    ['상', 30, 'bg-primary'],
  ],
  advanced: [
    ['중', 30, 'bg-secondary/60'],
    ['상', 70, 'bg-secondary'],
  ],
}
// 백엔드 difficulty 는 단일 값이라, 혼합 출제가 지원되기 전까지 대표 난이도로 보내요
const API_DIFFICULTY = { basic: 'medium', advanced: 'hard' }

// 확정된 개념이 있는 단원만 → [{ id, title, source, versionIds }]
function toUnits(material, units = [], concepts = []) {
  return [...units]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((u) => {
      const confirmed = concepts
        .filter((c) => c.unit_id === u.id && c.current_version.is_confirmed)
        .map((c) => c.current_version)
      return {
        id: u.id,
        title: u.title,
        source: `${material?.filename ?? ''} · ${pageRange(confirmed.flatMap((v) => v.evidence))}`,
        versionIds: confirmed.map((v) => v.id),
      }
    })
    .filter((u) => u.versionIds.length > 0)
}

// A-03 개념 확인 설정 (08 대체) · mode='advanced' 면 A-08 심화 문제
export default function QuizCreatePage({ mode = 'basic' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const advanced = mode === 'advanced'
  const fromReview = params.get('from') === 'review' // A-07 보충 문제: 부족한 항목 개념 · 기본 5문제
  const scopes = advanced
    ? ['단원 전체', '여러 단원']
    : ['오늘 배운 개념', '단원 전체', '직접 선택']
  const [scope, setScope] = useState(scopes[0])
  const [count, setCount] = useState(fromReview ? 5 : 10)
  const [unitTitle, setUnitTitle] = useState(null)
  const [picked, setPicked] = useState(() =>
    fromReview
      ? ['since와 for 구분', '과거 시점 부사와의 구분']
      : CONCEPTS.filter((c) => c.today).map((c) => c.name),
  )
  const wholeUnit = scope === '단원 전체' || scope === '여러 단원'
  const scopeConcepts = wholeUnit ? CONCEPTS.map((c) => c.name) : picked
  const dday = useDday()

  const materialId = useStudyStore((s) => s.materialId)
  const material = useMaterial(materialId)
  const unitsQuery = useUnits(materialId)
  const conceptsQuery = useConcepts(materialId)
  const today = useToday()
  const create = useCreateQuestionSet()

  // 오늘 화면에서 ?task= 로 들어오면 그 할 일의 단원·개념 버전으로 만들어요
  const task = today.data?.tasks.find((t) => t.id === params.get('task') && t.task_type === 'solve')
  const units = USE_MOCK ? DUMMY_UNITS : toUnits(material.data, unitsQuery.data, conceptsQuery.data)
  const taskUnitId = task?.concepts[0]?.unit_id
  const selected =
    units.find((u) => u.title === unitTitle) ?? units.find((u) => u.id === taskUnitId) ?? units[0]

  const onCreate = () => {
    const kind = advanced ? 'advanced' : fromReview ? 'supplement' : 'check'
    const solveUrl = `/quiz/solve?kind=${kind}&n=${count}`
    if (USE_MOCK) return navigate(solveUrl)
    if (!selected) return alert('확정한 개념이 없어요. 개념 확인을 먼저 해 주세요.')
    const useTask = task && selected.id === taskUnitId
    create.mutate(
      {
        unit_id: selected.id,
        task_id: useTask ? task.id : null,
        concept_version_ids: useTask ? task.concept_version_ids : selected.versionIds,
        count,
        difficulty: API_DIFFICULTY[mode],
      },
      { onSuccess: () => navigate(solveUrl), onError: (err) => alert(err.message) },
    )
  }

  return (
    <Screen
      header={{ title: advanced ? '심화 문제' : '개념 확인', dday }}
      bottom={
        <Button
          onClick={onCreate}
          variant={scopeConcepts.length === 0 ? 'disabled' : 'primary'}
          disabled={create.isPending}
        >
          {create.isPending ? '문제를 만들고 있어요…' : advanced ? '심화 문제 시작' : '문제 만들기'}
        </Button>
      }
      className="gap-[22px]"
    >
      {advanced ? (
        <PageTitle
          eyebrow="단원 3 · 현재완료"
          title="실력을 넓혀 볼까요?"
          desc="상 난이도 중심의 응용 · 복합 문제예요."
        />
      ) : (
        <PageTitle
          title="배운 개념을 문제로 확인해요"
          desc="내 자료와 확정한 개념을 바탕으로 만들어요."
        />
      )}

      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] leading-[1.3] font-bold">출제 범위</p>
        <Segment options={scopes} value={scope} onChange={setScope} />
        {USE_MOCK ? (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-wrap gap-[6px]">
              {scopeConcepts.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-primary-soft py-[5px] pr-[6px] pl-3 text-[13px] font-bold text-primary"
                >
                  {name}
                  {!wholeUnit && (
                    <button
                      type="button"
                      aria-label={`${name} 빼기`}
                      onClick={() => setPicked((p) => p.filter((x) => x !== name))}
                      className="flex size-[18px] items-center justify-center rounded-full hover:bg-primary/10"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {scope === '직접 선택' && (
              <ul className="flex flex-wrap gap-[6px]">
                {CONCEPTS.filter((c) => !picked.includes(c.name)).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setPicked((p) => [...p, c.name])}
                      className="rounded-full border border-dashed border-line px-3 py-[5px] text-[13px] font-medium text-sub"
                    >
                      + {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {scopeConcepts.length === 0 ? (
              <p className="text-xs text-error">범위에 개념을 1개 이상 넣어 주세요.</p>
            ) : (
              <Source>토익 문법 정리.pdf · p.24–25</Source>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-[6px]">
            <Field label="단원" strong>
              <Select
                options={units.map((u) => u.title)}
                value={selected?.title ?? ''}
                onChange={(e) => setUnitTitle(e.target.value)}
              />
            </Field>
            {selected && <Source>{selected.source}</Source>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">문제 수</p>
          <p className="text-xs text-muted">예상 {Math.round(count * 1.2)}분</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="한 문제 빼기"
            disabled={count <= 5}
            onClick={() => setCount((c) => c - 1)}
            className="flex size-11 items-center justify-center rounded-xl bg-cool text-xl font-bold disabled:opacity-30"
          >
            −
          </button>
          <span className="flex-1 text-center text-[26px] leading-[1.2] font-bold tracking-[-0.52px] tabular-nums">
            {count}문제
          </span>
          <button
            type="button"
            aria-label="한 문제 더하기"
            disabled={count >= 20}
            onClick={() => setCount((c) => c + 1)}
            className="flex size-11 items-center justify-center rounded-xl bg-cool text-xl font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
        <input
          type="range"
          min={5}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          aria-label="문제 수"
          className="w-full accent-primary"
        />
      </div>

      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] leading-[1.3] font-bold">난이도 구성</p>
        <p className="text-sm text-sub">
          {advanced ? '상 위주에 중이 일부 섞여 나와요.' : '상 · 중 · 하가 섞여 나와요.'}
        </p>
        <div className="flex h-7 overflow-hidden rounded-lg">
          {MIX[mode].map(([k, v, c]) => (
            <span
              key={k}
              className={`flex items-center justify-center text-[11px] font-bold text-white ${c}`}
              style={{ width: `${v}%` }}
            >
              {k} {v}%
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] bg-cool px-4 py-[14px]">
        <div className="flex gap-[10px]">
          <img src={iconLock} alt="" className="size-[18px] shrink-0" />
          <div className="flex flex-col gap-[2px]">
            <p className="flex items-center gap-[6px] text-sm leading-[1.4] font-bold tracking-[-0.14px]">
              비공개로 만들어요 <Chip>기본</Chip>
            </p>
            <p className="text-[13px] leading-[1.5] text-sub">
              내 문제와 풀이 기록은 나만 볼 수 있어요.
            </p>
          </div>
        </div>
        <Divider />
        <div className="flex gap-[10px] text-muted">
          <img src={iconShare} alt="" className="size-[18px] shrink-0" />
          <div className="flex flex-1 flex-col gap-[2px]">
            <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">
              공개 공유 · 출시 예정
            </p>
            <p className="text-xs leading-[1.5]">
              공유는 직접 선택할 때만 이뤄져요.
              <br />
              원본 자료와 비공개 페이지는 공개되지 않아요.
            </p>
          </div>
          <Toggle disabled />
        </div>
      </div>
    </Screen>
  )
}
