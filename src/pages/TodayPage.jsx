import { useState } from 'react'
import { Link } from 'react-router-dom'
import iconRightWhite from '@/assets/icons/right-white.svg'
import iconCheck from '@/assets/icons/check-primary-14.svg'
import iconBookmark from '@/assets/icons/bookmark.svg'
import iconRightMuted from '@/assets/icons/right-muted.svg'
import iconChevDown from '@/assets/icons/chevdown.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import {
  useDday,
  useRecentQuestionSets,
  useToday,
  useUpdatePlanTask,
  useWeaknesses,
} from '@/hooks/useStudyApi'
import { quizProgress } from '@/utils/quizProgress'
import { useConceptReadStore } from '@/stores/useConceptReadStore'
import { useProfileStore } from '@/stores/useProfileStore'

// 더미 (목 모드) · /today 응답과 같은 모양이라 실제 화면과 같은 변환을 거쳐요
const mockConcept = (id, name) => ({
  concept_id: id,
  concept_version_id: `v${id}`,
  concept_name: name,
  unit_title: '실전 핵심 영어 회화 패턴',
})
const MOCK_CONCEPTS = [
  mockConcept('1', '후회와 아쉬움 표현 (should have + p.p.)'),
  mockConcept('2', 'Would you mind ~ing? 패턴'),
  mockConcept('3', '간접의문문 어순 정리'),
]
const mockTask = (id, type, c, extra = {}) => ({
  id,
  task_type: type,
  status: 'pending',
  title: c.concept_name,
  concepts: [c],
  concept_version_ids: [c.concept_version_id],
  ...extra,
})
const [m1, m2, m3] = MOCK_CONCEPTS
const DUMMY_TODAY = {
  tasks: [
    mockTask('q1', 'solve', m1, { status: 'completed', target_count: 5, completed_count: 5 }),
    mockTask('q2', 'solve', m2, { target_count: 5, completed_count: 2 }),
    mockTask('q3', 'solve', m3, { target_count: 5, completed_count: 0 }),
    mockTask('t1', 'teach_back', m1),
    mockTask('t2', 'teach_back', m2),
    mockTask('t3', 'teach_back', m3),
  ],
}
const DUMMY_READ = { v1: 1, v2: 1 }
const DUMMY_WEAK = [
  { concept_name: '과거 시점 부사', latest_coverage: 0.76, incorrect_attempts: 2 },
]

const conceptNames = (t) => t.concepts.map((c) => c.concept_name).join(' · ')
const isClosed = (t) => t.status === 'completed' || t.status === 'skipped'

// 칩 톤 (Chip 의 tones) · 할 수 있는 일은 primary(연한 파랑), 끝난 일은 outline, 잠김·건너뜀은 cool
const DONE = (label) => ({ label, tone: 'outline', check: true })
const TODO = (label) => ({ label, tone: 'primary' })
const SKIPPED = { label: '건너뜀', tone: 'cool' }

// 퀴즈 칩 · 숫자(2/2) 대신 상태만 보여줘요
// 완료 = 서버 진행도 완료 또는 이 할 일의 개념으로 만든 세트를 끝까지 풀었을 때 (utils/quizProgress)
function quizChip(t, progress) {
  if (t.status === 'skipped') return SKIPPED
  if (progress === 'done') return DONE('완료')
  if (progress === 'started') return { label: '풀이 중', tone: 'secondary' }
  return TODO('퀴즈 풀기')
}

// 서버 할 일의 건너뛰기 · 되돌리기 (복습은 직접 완료하므로 완료도 되돌릴 수 있어요)
function taskAction(t) {
  if (t.status === 'skipped' || (t.task_type === 'review' && t.status === 'completed'))
    return { label: '되돌리기', task: { taskId: t.id, status: 'pending' } }
  if (t.status !== 'completed')
    return { label: '건너뛰기', task: { taskId: t.id, status: 'skipped' } }
  return null
}

// API(/today) + 읽은 개념 → 단계 카드 3개(+ 복습)
// read[id]: 숫자 = 읽음, 'skipped' = 이미 알아서 건너뜀
function toView(today, read, weaknesses = [], sets = []) {
  const tasks = [...today.tasks].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const byType = (type) => tasks.filter((t) => t.task_type === type)
  const concepts = [
    ...new Map(tasks.flatMap((t) => t.concepts).map((c) => [c.concept_version_id, c])).values(),
  ]
  const isRead = (t) => t.concept_version_ids.every((id) => read[id])

  const stages = [
    {
      key: 'study',
      title: '개념 학습',
      rows: concepts.map((c) => {
        const id = c.concept_version_id
        const state = read[id]
        return {
          id,
          ids: [id],
          name: c.concept_name,
          done: typeof state === 'number',
          closed: Boolean(state),
          chip: state === 'skipped' ? SKIPPED : state ? DONE('학습 완료') : TODO('학습하기'),
          action:
            state === 'skipped'
              ? { label: '되돌리기', local: 'unmark' }
              : !state
                ? { label: '건너뛰기', local: 'skip' }
                : null,
          to: `/study?concept=${id}`,
        }
      }),
    },
    {
      key: 'quiz',
      title: '개념 확인 퀴즈',
      rows: byType('solve').map((t) => {
        const progress = quizProgress(t, sets)
        const done = t.status !== 'skipped' && progress === 'done'
        return {
          id: t.id,
          ids: t.concept_version_ids,
          name: conceptNames(t),
          done,
          closed: done || isClosed(t),
          chip: quizChip(t, progress),
          // 프론트에서만 완료로 본 할 일은 건너뛰기를 숨겨요
          action: done && t.status !== 'completed' ? null : taskAction(t),
          // 덜 푼 문제가 있으면 만들기 화면에서 바로 이어 풀기로 넘어가요
          to: `/quiz?task=${t.id}&resume=1`,
        }
      }),
    },
    {
      key: 'teach',
      title: 'AI 학생에게 설명하기',
      rows: byType('teach_back').map((t) => {
        // 개념을 읽어야 설명할 수 있어요
        const locked = !isClosed(t) && !isRead(t)
        return {
          id: t.id,
          ids: t.concept_version_ids,
          name: conceptNames(t),
          done: t.status === 'completed',
          closed: isClosed(t),
          chip:
            t.status === 'completed'
              ? DONE('설명 완료')
              : t.status === 'skipped'
                ? SKIPPED
                : locked
                  ? { label: '학습 후 가능', tone: 'cool' }
                  : TODO('설명하기'),
          action: taskAction(t),
          locked,
          to: `/teach/prepare?task=${t.id}`,
        }
      }),
    },
    {
      key: 'review',
      title: '복습',
      // 복습은 개념 설명을 다시 읽고 '복습 완료'로 직접 완료해요
      rows: byType('review').map((t) => ({
        id: t.id,
        ids: t.concept_version_ids,
        name: conceptNames(t),
        done: t.status === 'completed',
        closed: isClosed(t),
        chip:
          t.status === 'completed'
            ? DONE('복습 완료')
            : t.status === 'skipped'
              ? SKIPPED
              : TODO('복습하기'),
        action: taskAction(t),
        to: `/study?concept=${t.concept_version_ids[0]}&task=${t.id}`,
      })),
    },
  ]
    .filter((s) => s.rows.length)
    .map((s) => ({
      ...s,
      done: s.rows.filter((r) => r.closed).length,
    }))

  // 다음에 할 일: 단계 순서대로 아직 안 끝난 첫 행
  let next = null
  for (const s of stages) {
    const row = s.rows.find((r) => !r.closed && !r.locked)
    if (row) {
      next = { stage: s.key, title: s.title, to: row.to }
      break
    }
  }

  const conceptDone = concepts.filter((c) =>
    stages.every(
      (s) =>
        s.key === 'review' ||
        s.rows.filter((r) => r.ids.includes(c.concept_version_id)).every((r) => r.closed),
    ),
  ).length
  const coverages = weaknesses.map((w) => w.latest_coverage).filter((v) => v !== null)
  const avg = coverages.length
    ? `${Math.round((coverages.reduce((a, b) => a + b, 0) / coverages.length) * 100)}%`
    : '-'
  const topWeak = [...weaknesses].sort((a, b) => b.incorrect_attempts - a.incorrect_attempts)[0]

  return {
    unitLabel: `오늘의 단원${concepts[0] ? ` · ${concepts[0].unit_title}` : ''}`,
    // 카드에는 대표 개념 하나만 노출
    unitTitle: concepts[0]?.concept_name || '오늘 학습',
    unitMeta: concepts.length > 1 ? `외 ${concepts.length - 1}개 개념` : '개념 1개',
    unitTo: concepts[0] ? `/study?concept=${concepts[0].concept_version_id}` : '/study',
    conceptCount: concepts.length,
    progress: concepts.length ? Math.round((conceptDone / concepts.length) * 100) : 0,
    stats: [
      [`${conceptDone}/${concepts.length}`, '완료한 개념'],
      [avg, '평균 설명률'],
      [`${weaknesses.length}개`, '남은 약점'],
    ],
    stages,
    next,
    weakLink:
      topWeak && topWeak.incorrect_attempts > 0
        ? `자주 놓친 개념 · ${topWeak.concept_name} ${topWeak.incorrect_attempts}회`
        : null,
  }
}

function StageRow({ row, index }) {
  const update = useUpdatePlanTask()
  const skip = useConceptReadStore((s) => s.skip)
  const unmark = useConceptReadStore((s) => s.unmark)
  const onAction = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const { action } = row
    if (action.local === 'skip') return skip(row.id)
    if (action.local === 'unmark') return unmark(row.id)
    if (USE_MOCK) return toast('목 모드에서는 바꿀 수 없어요.')
    update.mutate(action.task, { onError: (err) => toast(err.message) })
  }
  const muted = row.locked || (row.closed && !row.done)

  const body = (
    <>
      <span
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-bold ${
          row.closed ? 'bg-primary-soft text-primary' : 'border-[1.5px] border-line text-muted'
        }`}
      >
        {index + 1}
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-sm leading-[1.45] tracking-[-0.14px] ${
          muted ? 'text-muted' : row.closed ? 'text-sub' : 'font-medium text-ink'
        }`}
        title={row.name}
      >
        {row.name}
      </span>
      {row.action && (
        <button
          type="button"
          onClick={onAction}
          disabled={update.isPending}
          className="shrink-0 px-1 text-[11px] leading-[1.3] text-muted underline underline-offset-2 hover:text-sub disabled:opacity-50"
        >
          {row.action.label}
        </button>
      )}
      <Chip tone={row.chip.tone}>
        {row.chip.check && <img src={iconCheck} alt="" className="size-3" />}
        {row.chip.label}
      </Chip>
    </>
  )
  const cls = 'flex items-center gap-2 py-[10px]'
  return row.locked ? (
    <div className={cls} aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link to={row.to} className={cls}>
      {body}
    </Link>
  )
}

function StageCard({ stage, number, active, open, onToggle }) {
  const total = stage.rows.length
  const pct = Math.round((stage.done / total) * 100)
  const complete = stage.done === total
  return (
    <section
      className={`flex flex-col rounded-[18px] border px-[14px] ${
        active
          ? 'border-blue-200 bg-gradient-to-b from-blue-50/60 to-white shadow-[0_4px_16px_rgba(63,114,224,0.10)]'
          : 'border-line bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-[10px] py-3 text-left"
      >
        <span
          className={`flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[13px] leading-none font-bold ${
            complete
              ? 'bg-primary-soft text-primary'
              : active
                ? 'bg-primary text-white'
                : 'bg-cool text-sub'
          }`}
        >
          {complete ? <img src={iconCheck} alt="완료" className="size-[14px]" /> : number}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[15px] leading-[1.4] font-bold tracking-[-0.15px] ${active ? 'text-primary' : ''}`}
        >
          {stage.title}
        </span>
        <span className="h-[5px] w-12 shrink-0 overflow-hidden rounded-full bg-cool">
          <span className="block h-full rounded-full bg-progress" style={{ width: `${pct}%` }} />
        </span>
        <span className="w-8 shrink-0 text-right text-xs leading-[1.3] font-medium text-sub">
          {stage.done}/{total}
        </span>
        <img
          src={iconChevDown}
          alt={open ? '접기' : '펼치기'}
          className={`size-4 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="-mt-1 flex flex-col divide-y divide-line border-t border-line pb-1">
          {stage.rows.map((r, i) => (
            <li key={r.id}>
              <StageRow row={r} index={i} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// 05 오늘
export default function TodayPage() {
  const today = useToday()
  const weaknesses = useWeaknesses()
  const recentSets = useRecentQuestionSets()
  const dday = useDday()
  const read = useConceptReadStore((s) => s.read)
  const name = useProfileStore((state) => state.name)
  const displayName = name === '선생님' ? '선생님' : `${name}님`
  // 펼친 단계 카드 · 처음에는 지금 할 차례인 카드만 (null = 기본값)
  const [openKeys, setOpenKeys] = useState(null)

  const view = USE_MOCK
    ? toView(DUMMY_TODAY, { ...DUMMY_READ, ...read }, DUMMY_WEAK)
    : today.data?.tasks.length
      ? toView(today.data, read, weaknesses.data, recentSets.data)
      : null

  if (!view) {
    return (
      <Screen header="app" tabs>
        <ApiState
          query={today}
          empty="아직 오늘의 학습 계획이 없어요."
          action={{ label: '자료 올리고 시작하기', to: '/upload' }}
        />
      </Screen>
    )
  }

  const opened = openKeys ?? new Set(view.next ? [view.next.stage] : [])
  const toggle = (key) => {
    const nextKeys = new Set(opened)
    if (nextKeys.has(key)) nextKeys.delete(key)
    else nextKeys.add(key)
    setOpenKeys(nextKeys)
  }

  return (
    <Screen
      header="app"
      tabs
      className="gap-0 pt-2 pb-0"
      bottom={
        view.next ? (
          <Button to={view.next.to}>이어서 하기 · {view.next.title}</Button>
        ) : (
          <Button to="/records" variant="secondary">
            오늘 학습 완료 · 기록 보기
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] leading-[1.4] font-medium tracking-[-0.13px] text-sub">
            {displayName}, 오늘도 가르쳐 볼까요?
          </p>
          {dday && <Chip>{dday}</Chip>}
        </div>
        <h1 className="text-[22px] leading-[1.3] font-bold tracking-[-0.66px]">
          오늘도, 내 말로 한 걸음
        </h1>
      </div>

      {/* 오늘의 단원 (그라데이션/오늘) */}
      <Link
        to={view.unitTo}
        className="mt-3 flex min-h-[168px] flex-col gap-3 rounded-[18px] bg-[linear-gradient(144deg,var(--color-logo-blue)_0%,var(--color-primary)_74%)] px-5 py-5 text-white"
      >
        <span className="flex items-center justify-between">
          <span className="min-w-0 truncate text-xs leading-[1.3] font-bold tracking-[-0.12px] text-white/80">
            {view.unitLabel}
          </span>
          <img src={iconRightWhite} alt="" className="size-[18px] shrink-0" />
        </span>
        <span className="truncate text-xl leading-[1.4] font-bold tracking-[-0.4px]">
          {view.unitTitle}
        </span>
        <span className="truncate text-[13px] leading-[1.4] text-white/80">{view.unitMeta}</span>
        <span className="mt-auto flex items-end justify-between">
          <span className="text-[13px] leading-[1.3] font-medium text-white/85">오늘 진행률</span>
          <span className="text-2xl leading-none font-bold">{view.progress}%</span>
        </span>
        <span className="h-1 overflow-hidden rounded-full bg-white/30">
          <span
            className="block h-full rounded-full bg-white"
            style={{ width: `${view.progress}%` }}
          />
        </span>
      </Link>

      {/* 학습 지표 */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {view.stats.map(([v, k]) => (
          <div
            key={k}
            className="flex flex-col items-center gap-[2px] rounded-xl bg-cool py-[10px] leading-[1.3]"
          >
            <span className="text-lg font-bold tracking-[-0.36px]">{v}</span>
            <span className="text-[11px] tracking-[-0.11px] text-sub">{k}</span>
          </div>
        ))}
      </div>

      {/* 오늘의 학습 단계 · 단계 카드 안에 개념별 상태 */}
      <section className="-mx-6 mt-4 flex flex-1 flex-col gap-2 bg-cool px-6 pt-3.5 pb-4">
        <div className="flex items-baseline justify-between px-1 pb-1 leading-[1.3]">
          <h2 className="text-base font-bold tracking-[-0.16px]">오늘의 학습 단계</h2>
          <span className="text-xs font-medium tracking-[-0.12px] text-sub">
            개념 {view.conceptCount}개 · 단계 {view.stages.length}개
          </span>
        </div>
        {view.stages.map((s, i) => (
          <StageCard
            key={s.key}
            stage={s}
            number={i + 1}
            active={view.next?.stage === s.key}
            open={opened.has(s.key)}
            onToggle={() => toggle(s.key)}
          />
        ))}
        {view.weakLink && (
          <Link
            to="/records"
            className="mt-2 flex items-center justify-center gap-2 text-[13px] leading-[1.4] font-medium tracking-[-0.13px] text-sub"
          >
            <img src={iconBookmark} alt="" className="size-[15px]" />
            {view.weakLink}
            <img src={iconRightMuted} alt="" className="size-[14px]" />
          </Link>
        )}
      </section>
    </Screen>
  )
}
