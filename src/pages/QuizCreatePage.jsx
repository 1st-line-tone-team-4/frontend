import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import iconLock from '@/assets/icons/lock.svg'
import iconShare from '@/assets/icons/share.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Segment, Select } from '@/components/Field'
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

const DIFFICULTY = { 하: 'easy', 중: 'medium', 상: 'hard' }
const COUNTS = ['10문제', '5문제', '15문제', '20문제']

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

// 08 문제 만들기
export default function QuizCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [scope, setScope] = useState('개념 선택')
  const [level, setLevel] = useState('중')
  const [count, setCount] = useState(COUNTS[0])
  const [unitTitle, setUnitTitle] = useState(null)
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
    if (USE_MOCK) return navigate('/quiz/solve')
    if (!selected) return alert('확정한 개념이 없어요. 개념 확인을 먼저 해 주세요.')
    const useTask = task && selected.id === taskUnitId
    create.mutate(
      {
        unit_id: selected.id,
        task_id: useTask ? task.id : null,
        concept_version_ids: useTask ? task.concept_version_ids : selected.versionIds,
        count: Number.parseInt(count, 10),
        difficulty: DIFFICULTY[level],
      },
      { onSuccess: () => navigate('/quiz/solve'), onError: (err) => alert(err.message) },
    )
  }

  return (
    <Screen
      header={{ title: '문제 만들기', dday }}
      bottom={
        <Button onClick={onCreate} disabled={create.isPending}>
          {create.isPending ? '문제를 만드는 중이에요…' : '문제 만들기'}
        </Button>
      }
      className="gap-[18px]"
    >
      <PageTitle
        title="읽은 개념을 문제로 확인해요"
        desc="내 자료와 확정한 개념을 바탕으로 만들어요."
      />

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">출제 범위</p>
        <Segment options={['개념 선택', '자료 전체']} value={scope} onChange={setScope} />
      </div>

      {scope === '개념 선택' && (
        <div className="flex flex-col gap-[6px]">
          <Field label="선택한 개념" strong>
            <Select
              options={units.map((u) => u.title)}
              value={selected?.title ?? ''}
              onChange={(e) => setUnitTitle(e.target.value)}
            />
          </Field>
          {selected && <Source>{selected.source}</Source>}
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">난이도</p>
        <Segment options={['하', '중', '상']} value={level} onChange={setLevel} />
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <Field label="문제 수" strong>
          <Select options={COUNTS} value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
        <Field label="시험 키워드" strong>
          <Select options={['토익', '토플', '텝스']} />
        </Field>
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
