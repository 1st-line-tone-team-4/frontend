import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Segment, Select } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import { TypingDots } from '@/components/voice/MicWave'
import {
  useBilling,
  useConcepts,
  useCreateQuestionSet,
  useDday,
  useMaterial,
  useRecentQuestionSets,
  useToday,
  useUnits,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { pageRange } from '@/utils/format'
import { resumableSet, setsForTask } from '@/utils/quizProgress'

/**
 * A-03 개념 확인 문제 만들기 · mode='advanced' 면 A-08 심화 문제
 * POST /question-sets 명세 기준
 * - 요청: unit_id · task_id · concept_version_ids · count · difficulty(easy|medium|hard) · model_id
 * - 할 일과 연결: solve 할 일의 개념 버전 집합을 그대로 보내고, count 는 남은 목표 이하
 * - 409 JOB_IN_PROGRESS → 같은 조건으로 만드는 중 · 409 DUPLICATE_EXECUTION_ACK_REQUIRED → 동의 후 재요청
 * - 202 job 완료 → job.resource_id(문제 세트 id) 로 풀이 화면 이동
 */

const DIFFICULTIES = [
  ['easy', '하'],
  ['medium', '중'],
  ['hard', '상'],
]
const DIFFICULTY_LABEL = Object.fromEntries(DIFFICULTIES)
const MIN_COUNT_FREE = 5
const MIN_COUNT_PAID = 2
const MAX_COUNT_FREE = 10
const MAX_COUNT_PAID = 20
// GET /billing/capabilities · 지금은 결제 연동 전이라 모두 subscription_status=pricing_pending(무료)
// 결제가 열리면(checkout_enabled) 구독 중 상태값을 여기에 맞춰 주세요
const PAID_STATUS = ['active', 'trialing']
const SET_STATUS = { generating: '만드는 중', failed: '만들지 못했어요' }
const SOURCE_TASK = '오늘 할 일'
const SOURCE_PICK = '직접 고르기'

// 확정된 개념이 있는 단원만 → [{ id, title, versions: [{ id, name, evidence }] }]
function toUnits(units = [], concepts = []) {
  return [...units]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((u) => ({
      id: u.id,
      title: u.title,
      versions: concepts
        .filter((c) => c.unit_id === u.id && c.current_version?.is_confirmed)
        .map((c) => c.current_version),
    }))
    .filter((u) => u.versions.length > 0)
}

export default function QuizCreatePage({ mode = 'basic' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const advanced = mode === 'advanced'
  const fromReview = params.get('from') === 'review' // A-07 보충 문제
  const kind = advanced ? 'advanced' : fromReview ? 'supplement' : 'check'
  const dday = useDday()

  const materialId = useStudyStore((s) => s.materialId)
  const setIds = useStudyStore((s) => s.setIds)
  const material = useMaterial(materialId)
  const unitsQuery = useUnits(materialId)
  const conceptsQuery = useConcepts(materialId)
  const today = useToday()
  const create = useCreateQuestionSet()
  const billing = useBilling()

  // 화면 상태 (null = 아직 사용자가 바꾸지 않음 → 기본값 사용)
  const [source, setSource] = useState(null)
  const [unitId, setUnitId] = useState(null)
  const [excluded, setExcluded] = useState([]) // 직접 고르기에서 뺀 개념 버전 id
  const [rawCount, setCount] = useState(null)
  const [difficulty, setDifficulty] = useState(advanced ? 'hard' : 'medium')

  const units = toUnits(unitsQuery.data, conceptsQuery.data)

  // ?task= 로 들어온 solve 할 일 · 남은 목표가 있고 이 자료의 단원일 때만 연결할 수 있어요
  const task = today.data?.tasks.find((t) => t.id === params.get('task') && t.task_type === 'solve')
  const remaining = task ? task.target_count - task.completed_count : 0
  const taskUnit = units.find((u) => u.id === task?.concepts?.[0]?.unit_id)
  const canLinkTask = !!task && remaining > 0 && !!taskUnit && task.concept_version_ids?.length > 0
  const linked = canLinkTask && (source ?? SOURCE_TASK) === SOURCE_TASK

  const unit = linked
    ? taskUnit
    : (units.find((u) => u.id === unitId) ?? taskUnit ?? units[0])
  const versions = unit?.versions ?? []
  const versionIds = linked
    ? task.concept_version_ids
    : versions.map((v) => v.id).filter((id) => !excluded.includes(id))
  const chosen = versions.filter((v) => versionIds.includes(v.id))

  // 문제 수: 무료 5~10문제 · 유료 구독 2~20문제 · 오늘 할 일에서 만들면 남은 목표(예: 2문제)부터 고를 수 있어요
  // 목표보다 많이 만들면 명세상 task_id 를 못 보내지만, 같은 개념으로 만든 세트라
  // 다 풀면 오늘 화면에서 완료로 표시돼요 (utils/quizProgress)
  const paid = PAID_STATUS.includes(billing.data?.subscription_status)
  const planMin = paid ? MIN_COUNT_PAID : MIN_COUNT_FREE
  const minCount = linked ? Math.max(1, Math.min(planMin, remaining)) : planMin
  const maxCount = paid ? MAX_COUNT_PAID : MAX_COUNT_FREE
  const clamp = (n) => Math.min(Math.max(n, minCount), maxCount)
  const defaultCount = linked ? clamp(remaining) : fromReview ? clamp(5) : clamp(10)
  const count = clamp(rawCount ?? defaultCount)
  // 명세: task_id 를 보내면 count 는 남은 목표 이하 → 넘으면 할 일과 연결하지 않고 따로 만들어요
  const countsToTask = linked && count <= remaining

  // 최근 만든 문제 · 오늘 할 일에서 왔으면 그 할 일의 세트(연결 또는 같은 개념)만
  const recent = useRecentQuestionSets()
  const sets = linked ? setsForTask(task, recent.data) : (recent.data ?? [])
  const canSubmit = !!unit && versionIds.length > 0 && !create.isPending

  // 오늘 화면에서 '퀴즈 풀기'로 들어오면(?resume=1) 이 할 일의 세트 중 덜 푼 세트로 바로 이어 풀어요
  // 만들기 화면은 기록에서 바꿔치기(replace)해서, 풀이 화면의 뒤로가기는 오늘 화면으로 가요
  const resumeTaskId = params.get('resume') ? params.get('task') : null
  const resumeTask = today.data?.tasks.find((t) => t.id === resumeTaskId)
  const resumeId = resumeTaskId ? resumableSet(resumeTask, recent.data)?.id : undefined
  useEffect(() => {
    if (!resumeId) return
    setIds({ questionSetId: resumeId })
    navigate(`/quiz/solve?kind=${kind}`, { replace: true })
  }, [resumeId, kind, navigate, setIds])

  const onCreate = () => {
    if (!canSubmit) return
    const body = {
      unit_id: unit.id,
      task_id: countsToTask ? task.id : null,
      concept_version_ids: versionIds,
      count,
      difficulty,
    }
    const onError = (err) => {
      if (err?.code === 'DUPLICATE_EXECUTION_ACK_REQUIRED') {
        const ok = window.confirm(
          '이전에 같은 조건으로 만들다가 결과를 확인하지 못한 작업이 있어요.\n다시 만들면 문제가 중복으로 생길 수 있어요. 계속할까요?',
        )
        if (ok) send(true)
        return
      }
      if (err?.code === 'JOB_IN_PROGRESS') {
        return alert('같은 조건으로 문제를 만들고 있어요. 잠시 후 아래 목록에서 확인해 주세요.')
      }
      alert(err?.message ?? '문제를 만들지 못했어요. 다시 시도해 주세요.')
    }
    const send = (ack) =>
      create.mutate(
        { ...body, acknowledge_possible_duplicate_execution: ack },
        { onSuccess: () => navigate(`/quiz/solve?kind=${kind}`), onError },
      )
    send(false)
  }

  const openSet = (set) => {
    setIds({ questionSetId: set.id })
    navigate(`/quiz/solve?kind=${kind}`)
  }

  const header = { title: advanced ? '심화 문제' : fromReview ? '보충 문제' : '개념 확인 퀴즈', dday }

  // 이어 풀 세트를 찾는 중이거나 찾아서 넘어가는 중
  if (resumeTaskId && (today.isLoading || recent.isLoading || resumeId)) {
    return (
      <Screen header={header}>
        <ApiState query={{ isLoading: true }} />
      </Screen>
    )
  }

  // 자료 · 단원 · 개념을 불러오는 중이거나, 확정한 개념이 없을 때
  if (!materialId || units.length === 0) {
    const loading = unitsQuery.isLoading || conceptsQuery.isLoading
    const failed = unitsQuery.isError ? unitsQuery : conceptsQuery.isError ? conceptsQuery : null
    return (
      <Screen header={header}>
        <ApiState
          query={loading ? { isLoading: true } : failed}
          empty={
            materialId
              ? '확정한 개념이 아직 없어요.\n개념을 확인하고 확정하면 문제를 만들 수 있어요.'
              : '먼저 학습 자료를 올려 주세요.'
          }
          action={materialId ? { label: '개념 확인하기', to: '/concepts' } : { label: '자료 올리기', to: '/upload' }}
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={header}
      bottom={
        <Button onClick={onCreate} variant={canSubmit ? 'primary' : 'disabled'}>
          {create.isPending ? (
            <>
              <TypingDots className="h-[21px]" />
              <span className="sr-only">문제를 만들고 있어요</span>
            </>
          ) : (
            `${count}문제 만들기`
          )}
        </Button>
      }
      className="gap-[22px]"
    >
      <PageTitle
        eyebrow={advanced ? unit?.title : undefined}
        title={advanced ? '실력을 넓혀 볼까요?' : '배운 개념을 문제로 확인해요'}
        desc={`${material.data?.filename ?? '내 자료'}와 확정한 개념으로 만들어요.`}
      />

      {/* 출제 범위: 오늘 할 일(개념 버전 고정) 또는 단원 · 개념 직접 고르기 */}
      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] leading-[1.3] font-bold">출제 범위</p>
        {canLinkTask && (
          <Segment
            options={[SOURCE_TASK, SOURCE_PICK]}
            value={linked ? SOURCE_TASK : SOURCE_PICK}
            onChange={setSource}
          />
        )}

        {linked ? (
          <p className="text-sm leading-[1.5] text-sub">
            오늘 할 일의 개념으로 만들어요.
            <span className="font-bold text-ink"> (남은 목표 {remaining}문제)</span>
          </p>
        ) : (
          <Field label="단원" strong>
            <Select
              options={units.map((u) => u.title)}
              value={unit?.title ?? ''}
              onChange={(e) => {
                setUnitId(units.find((u) => u.title === e.target.value)?.id ?? null)
                setExcluded([])
              }}
            />
          </Field>
        )}

        <ul className="flex flex-wrap gap-[6px]">
          {versions.map((v) => {
            const on = versionIds.includes(v.id)
            return (
              <li key={v.id}>
                <button
                  type="button"
                  disabled={linked}
                  aria-pressed={on}
                  onClick={() =>
                    setExcluded((ex) => (on ? [...ex, v.id] : ex.filter((id) => id !== v.id)))
                  }
                  className={`rounded-full px-3 py-[5px] text-[13px] leading-[1.3] ${
                    on
                      ? 'bg-primary-soft font-bold text-primary'
                      : 'border border-dashed border-line font-medium text-sub'
                  } ${linked ? 'cursor-default' : ''}`}
                >
                  {on ? v.name : `+ ${v.name}`}
                </button>
              </li>
            )
          })}
        </ul>
        {versionIds.length === 0 ? (
          <p className="text-xs text-error">개념을 1개 이상 골라 주세요.</p>
        ) : (
          <Source>
            {material.data?.filename ?? ''} · {pageRange(chosen.flatMap((v) => v.evidence ?? []))}
          </Source>
        )}
      </div>

      {/* 문제 수: 1 ~ 20 · 할 일과 연결하면 남은 목표 이하 */}
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">문제 수</p>
          <p className="text-xs text-muted">예상 {Math.max(1, Math.round(count * 1.2))}분</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="한 문제 빼기"
            disabled={count <= minCount}
            onClick={() => setCount(count - 1)}
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
            disabled={count >= maxCount}
            onClick={() => setCount(count + 1)}
            className="flex size-11 items-center justify-center rounded-xl bg-cool text-xl font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
        <input
          type="range"
          min={minCount}
          max={maxCount}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          aria-label="문제 수"
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted tabular-nums">
          <span>{minCount}문제</span>
          <span>{maxCount}문제</span>
        </div>
        {!paid && (
          <p className="text-xs text-muted">
            무료 이용은 최대 {MAX_COUNT_FREE}문제까지 만들 수 있어요. 구독하면 {MIN_COUNT_PAID}~{MAX_COUNT_PAID}문제로
            늘릴 수 있어요.
          </p>
        )}
        {linked && (
          <p className="text-xs text-muted">
            이 문제를 끝까지 풀면 오늘 할 일이 완료로 표시돼요.
          </p>
        )}
      </div>

      {/* 난이도: API 는 세트마다 한 가지 난이도 */}
      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] leading-[1.3] font-bold">난이도</p>
        <Segment
          options={DIFFICULTIES.map(([, label]) => label)}
          value={DIFFICULTY_LABEL[difficulty]}
          onChange={(label) => setDifficulty(DIFFICULTIES.find(([, l]) => l === label)[0])}
        />
      </div>

      {create.isPending && (
        <p className="text-center text-xs text-muted">
          AI가 문제를 만들고 있어요. 다 만들면 바로 풀이 화면으로 넘어가요.
        </p>
      )}

      {/* 내가 만든 문제 (GET /question-sets) · 이어 풀기 */}
      {sets.length > 0 && (
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] leading-[1.3] font-bold">
            {linked ? '이 할 일로 만든 문제' : '최근 만든 문제'}
          </p>
          <ul className="flex flex-col">
            {sets.slice(0, 5).map((set, i) => (
              <li key={set.id}>
                {i > 0 && <Divider />}
                <button
                  type="button"
                  disabled={set.status !== 'ready'}
                  onClick={() => openSet(set)}
                  className="flex w-full items-center justify-between py-3 text-left disabled:opacity-50"
                >
                  <span className="text-sm leading-[1.4] font-medium">
                    {set.count}문제 · 난이도 {DIFFICULTY_LABEL[set.difficulty]}
                  </span>
                  <Chip tone={set.status === 'failed' ? 'error' : 'cool'}>
                    {set.status !== 'ready'
                      ? SET_STATUS[set.status]
                      : set.next_ordinal === null
                        ? '다 풀었어요'
                        : `${set.next_ordinal}번부터 이어 풀기`}
                  </Chip>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Screen>
  )
}
