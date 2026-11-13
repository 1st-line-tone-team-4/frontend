import { useState } from 'react'
import { Link } from 'react-router-dom'
import iconRightWhite from '@/assets/icons/right-white.svg'
import iconBook from '@/assets/icons/book-sm.svg'
import iconRefresh from '@/assets/icons/refresh.svg'
import iconFlag from '@/assets/icons/flag.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Input, Segment } from '@/components/Field'
import { BottomSheet, toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import {
  useDday,
  useExamGoals,
  useReschedulePlan,
  useStudyPlan,
  useUpdateExamGoal,
} from '@/hooks/useStudyApi'
import { daysUntil, formatDday, formatKoreanDate, formatMonthDay, toYmd } from '@/utils/format'

const GOAL_STATUS = [
  { value: 'active', label: '진행 중' },
  { value: 'paused', label: '잠시 멈춤' },
  { value: 'completed', label: '끝난 시험' },
]

// 할 일 종류 · 상태 표시 (바텀시트)
const TASK_LABEL = { solve: '문제 풀기', teach_back: '설명하기', review: '복습하기' }
const TASK_STATUS = {
  pending: { label: '대기', tone: 'cool' },
  in_progress: { label: '진행 중', tone: 'primary' },
  completed: { label: '완료', tone: 'solid' },
  skipped: { label: '건너뜀', tone: 'outline' },
}
const taskLink = (t) => {
  if (t.task_type === 'solve') return `/quiz?task=${t.id}`
  if (t.task_type === 'teach_back') return `/teach/prepare?task=${t.id}`
  return `/study?concept=${t.concept_version_ids[0]}&task=${t.id}`
}

// 남은 일수(= D-day 숫자)에 따라 코스 이름 · 안내 문구
function courseCopy(days, conceptCount) {
  const title =
    days === 0
      ? '시험 당일 최종 점검'
      : days <= 7
        ? `${days}일 압축 코스`
        : days <= 30
          ? `${days}일 맞춤 코스`
          : `${days}일 학습 코스`
  const guide =
    days >= 8
      ? `확정한 ${conceptCount}개 개념을 시험일까지 차근차근 배워요. 매일 개념을 익히고 AI 학생에게 설명하며 빈틈을 채워요.`
      : `확정한 ${conceptCount}개 개념을 처음부터 배워요. 개념은 더 묶고 문제 수는 줄여, 틀린 개념을 설명하는 데 집중해요.`
  return { title, guide }
}

// 더미 (목 모드에서 표시) · 오늘을 11.03(화)로 보고 D-6 · 11.03~11.08 학습 · 11.09(월) 시험
const mockTasks = (date, names) =>
  names.flatMap((name, i) =>
    ['solve', 'teach_back', 'review'].map((type) => ({
      id: `${date}-${i}-${type}`,
      title: `${name} · ${TASK_LABEL[type]}`,
      task_type: type,
      status: 'pending',
      concept_version_ids: [`mock-${i}`],
    })),
  )
const DUMMY_DAYS = 6
const DUMMY = {
  ...courseCopy(DUMMY_DAYS, 8),
  dday: `D-${DUMMY_DAYS}`,
  examLine: '토익 정기시험 · 11월 9일 월요일',
  conceptCount: 8,
  overdue: 0,
  today: { date: '11.03', day: '화', count: 2, title: '현재시제 · 현재완료의 형태' },
  schedule: [
    { date: '11.04', day: '수', title: '과거시제 · 미래시제', count: 2 },
    { date: '11.05', day: '목', title: '수 일치 · since와 for', count: 2 },
    { date: '11.06', day: '금', title: '계속 용법', count: 1 },
    { date: '11.07', day: '토', title: '과거 시점 부사', count: 1 },
  ].map((r) => ({ ...r, tasks: mockTasks(r.date, r.title.split(' · ')) })),
  review: { date: '11.08', day: '일', tasks: [] },
  exam: { date: '11.09', day: '월' },
}

const uniqueConcepts = (tasks) => [
  ...new Map(tasks.flatMap((t) => t.concepts).map((c) => [c.concept_id, c])).values(),
]

// API(계획 + 시험 목표) → 화면 데이터
function toView(plan, goal) {
  const todayYmd = toYmd()
  const byDate = new Map()
  for (const t of plan.tasks) {
    if (!byDate.has(t.due_date)) byDate.set(t.due_date, [])
    byDate.get(t.due_date).push(t)
  }
  const dates = [...byDate.keys()].sort()
  const rows = dates
    .filter((d) => d >= todayYmd)
    .map((d) => {
      const tasks = [...byDate.get(d)].sort((a, b) => a.display_order - b.display_order)
      const concepts = uniqueConcepts(tasks)
      return {
        ymd: d,
        ...formatMonthDay(d),
        title: concepts.map((c) => c.concept_name).join(' · '),
        count: concepts.length,
        reviewOnly: tasks.every((t) => t.task_type === 'review'),
        tasks,
      }
    })
  const last = rows[rows.length - 1]
  const review = last?.reviewOnly && rows.length > 1 ? last : null
  const conceptCount = uniqueConcepts(plan.tasks).length
  // 남은 일수 = 시험일 - 오늘 (달력 일수 · D-day 숫자와 같아요)
  const days = goal ? Math.max(0, daysUntil(goal.exam_date)) : dates.length
  // 어제까지 끝내지 못한 할 일 (완료 · 건너뜀 제외)
  const overdue = plan.tasks.filter(
    (t) => t.due_date < todayYmd && t.status !== 'completed' && t.status !== 'skipped',
  ).length

  return {
    ...courseCopy(days, conceptCount),
    dday: goal ? formatDday(days) : null,
    examLine: goal ? `${goal.title} · ${formatKoreanDate(goal.exam_date)}` : '',
    conceptCount,
    overdue,
    today: rows[0]?.ymd === todayYmd ? rows[0] : null,
    schedule: rows.filter((r) => r.ymd !== todayYmd && r !== review),
    review,
    exam: goal ? formatMonthDay(goal.exam_date) : null,
  }
}

// 06 계획
export default function PlanPage() {
  const plan = useStudyPlan()
  const goals = useExamGoals()
  const reschedule = useReschedulePlan()
  const dday = useDday()
  const [editOpen, setEditOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(null) // 바텀시트로 볼 날짜 행

  const goal = goals.data?.items.find((g) => g.id === plan.data?.exam_goal_id)
  const view = USE_MOCK ? DUMMY : plan.data ? toView(plan.data, goal) : null

  if (!view) {
    return (
      <Screen header="app" tabs>
        <ApiState
          query={plan}
          empty="아직 학습 계획이 없어요."
          action={{ label: '자료 올리고 시작하기', to: '/upload' }}
        />
      </Screen>
    )
  }

  const onReschedule = () => {
    if (USE_MOCK || !plan.data) return
    reschedule.mutate(plan.data.id, {
      onSuccess: () => alert('남은 기간에 맞춰 코스를 다시 맞췄어요.'),
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Screen header="app" tabs className="gap-[10px] pt-[6px] pb-3">
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-[26px] leading-[1.3] font-bold tracking-[-0.78px]">{view.title}</h1>
        <div className="flex items-center gap-2">
          {(view.dday ?? dday) && <Chip className="py-[2px] text-[13px]">{view.dday ?? dday}</Chip>}
          <p className="text-sm leading-[1.4] tracking-[-0.14px] text-sub">{view.examLine}</p>
          {goal && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="text-[13px] font-bold text-primary"
            >
              수정
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-[14px] bg-cool px-4 py-[14px]">
        <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">
          시험일까지, 중요한 것부터 차근차근
        </p>
        <p className="text-[13px] leading-[1.55] tracking-[-0.13px] text-sub">{view.guide}</p>
      </div>

      {/* 밀린 할 일 안내 */}
      {view.overdue > 0 && (
        <p className="rounded-[14px] bg-error-soft px-4 py-3 text-[13px] leading-[1.55] font-medium text-error">
          어제까지 못 끝낸 학습 {view.overdue}개가 있어요. ‘코스 다시 맞추기’로 남은 일정에 다시
          배분할 수 있어요.
        </p>
      )}

      {/* 오늘 일정 (그라데이션/계획) */}
      {view.today && (
        <Link
          to="/today"
          className="flex flex-col gap-1 rounded-[18px] bg-[linear-gradient(158deg,#4e68b0_0%,var(--color-logo-navy)_74%)] py-4 pr-[18px] pl-5 text-white"
        >
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-[13px] leading-[1.3] font-bold text-white/85">
                {view.today.date} {view.today.day}
              </span>
              <span className="rounded-md bg-white/18 px-2 py-[3px] text-[11px] leading-[1.3] font-bold">
                오늘 · 개념 {view.today.count}개
              </span>
            </span>
            <img src={iconRightWhite} alt="" className="size-[18px]" />
          </span>
          <span className="text-lg leading-[1.4] font-bold tracking-[-0.36px]">
            {view.today.title}
          </span>
        </Link>
      )}

      <ul className="flex flex-col">
        {view.schedule.map((s) => (
          <li key={s.date}>
            <button
              type="button"
              onClick={() => setDayOpen(s)}
              className="flex w-full items-center gap-[14px] py-[10px] text-left"
            >
              <span className="flex w-11 flex-col leading-[1.3]">
                <span className="text-sm font-bold">{s.date}</span>
                <span className="text-xs text-sub">{s.day}</span>
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-[6px]">
                <img src={iconBook} alt="" className="size-[15px]" />
                <span className="text-sm leading-[1.4] font-medium tracking-[-0.14px]">
                  {s.title}
                </span>
              </span>
              <Chip tone="cool">개념 {s.count}개</Chip>
            </button>
            <Divider inset={58} />
          </li>
        ))}
        {view.review && (
          <li>
            <button
              type="button"
              onClick={() => setDayOpen({ ...view.review, title: '전체 복습' })}
              className="flex w-full items-center gap-[14px] py-[10px] text-left"
            >
              <span className="flex w-11 flex-col leading-[1.3]">
                <span className="text-sm font-bold">{view.review.date}</span>
                <span className="text-xs text-sub">{view.review.day}</span>
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-[6px]">
                <img src={iconRefresh} alt="" className="size-[15px]" />
                <span className="text-sm leading-[1.4] font-medium tracking-[-0.14px]">
                  전체 복습
                </span>
              </span>
              <Chip tone="secondary">마지막 날 · 복습</Chip>
            </button>
          </li>
        )}
      </ul>

      {view.exam && (
        <div className="flex gap-[10px] pt-[2px]">
          <img src={iconFlag} alt="" className="size-4 shrink-0" />
          <div className="flex flex-col gap-[2px] leading-[1.4]">
            <p className="text-[13px] font-bold">
              {view.exam.date} {view.exam.day} · 시험 당일
            </p>
            <p className="text-xs text-sub">시험 날짜나 개념이 바뀌면 코스를 다시 맞춰요.</p>
          </div>
        </div>
      )}

      <Button onClick={onReschedule} disabled={reschedule.isPending}>
        {reschedule.isPending ? '코스를 다시 맞추는 중이에요…' : '코스 다시 맞추기'}
      </Button>
      {goal && <GoalEditSheet goal={goal} open={editOpen} onClose={() => setEditOpen(false)} />}
      <DayTasksSheet day={dayOpen} onClose={() => setDayOpen(null)} />
    </Screen>
  )
}

// 시험 정보 수정 (PATCH /exam-goals/{id})
function GoalEditSheet({ goal, open, onClose }) {
  const update = useUpdateExamGoal()
  const [form, setForm] = useState(null)
  const value = form ?? { title: goal.title, exam_date: goal.exam_date, status: goal.status }
  const close = () => {
    setForm(null)
    onClose()
  }
  const save = () => {
    // 바뀐 값만 보내요 (최소 1개 필요)
    const body = Object.fromEntries(Object.entries(value).filter(([k, v]) => v !== goal[k]))
    if (body.title !== undefined && !body.title.trim()) return toast('시험 이름을 입력해 주세요.')
    if (Object.keys(body).length === 0) return close()
    update.mutate(
      { id: goal.id, ...body },
      {
        onSuccess: () => {
          toast(
            body.exam_date
              ? '저장했어요. 바뀐 날짜는 ‘코스 다시 맞추기’로 반영돼요.'
              : '저장했어요.',
          )
          close()
        },
        onError: (err) => toast(err.message),
      },
    )
  }
  return (
    <BottomSheet
      open={open}
      title="시험 정보 수정"
      onClose={close}
      footer={
        <Button onClick={save} disabled={update.isPending}>
          저장
        </Button>
      }
    >
      <Field label="시험 이름" strong>
        <Input
          value={value.title}
          maxLength={120}
          onChange={(e) => setForm({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label="시험 날짜" strong>
        <Input
          type="date"
          min={toYmd()}
          value={value.exam_date}
          onChange={(e) => setForm({ ...value, exam_date: e.target.value })}
        />
      </Field>
      <div className="flex flex-col gap-[6px]">
        <span className="text-[13px] leading-[1.3] font-bold">상태</span>
        <Segment
          options={GOAL_STATUS.map((s) => s.label)}
          value={GOAL_STATUS.find((s) => s.value === value.status)?.label}
          onChange={(label) =>
            setForm({ ...value, status: GOAL_STATUS.find((s) => s.label === label).value })
          }
        />
      </div>
    </BottomSheet>
  )
}

// 날짜별 할 일 (문제 풀기 · 설명하기 · 복습하기 진행 상태)
function DayTasksSheet({ day, onClose }) {
  const tasks = day?.tasks ?? []
  const firstConcept = tasks[0]?.concept_version_ids[0]
  return (
    <BottomSheet
      open={Boolean(day)}
      title={day ? `${day.date} ${day.day} · ${day.title}` : ''}
      onClose={onClose}
      footer={
        firstConcept && (
          <Button to={`/study?concept=${firstConcept}`} onClick={onClose}>
            첫 개념 먼저 보기
          </Button>
        )
      }
    >
      {tasks.length === 0 ? (
        <p className="text-sm leading-[1.55] text-sub">
          이날은 따로 정해진 할 일 없이 배운 개념을 전체 복습해요.
        </p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t, i) => {
            const st = TASK_STATUS[t.status] ?? TASK_STATUS.pending
            return (
              <li key={t.id}>
                {i > 0 && <Divider />}
                <Link to={taskLink(t)} onClick={onClose} className="flex items-center gap-3 py-3">
                  <span className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                    <span className="truncate text-sm font-bold">{t.title}</span>
                    <span className="text-xs text-sub">
                      {TASK_LABEL[t.task_type]}
                      {t.task_type !== 'review' && t.target_count
                        ? ` · ${t.completed_count}/${t.target_count}`
                        : ''}
                    </span>
                  </span>
                  <Chip tone={st.tone}>{st.label}</Chip>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}
