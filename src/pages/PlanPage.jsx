import { studyUrl } from '@/utils/studyModel'
import JobActionStatus from '@/components/JobActionStatus'
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
import Screen from '@/components/Screen'
import { useDday, useExamGoals, useReschedulePlan, useStudyPlan } from '@/hooks/useStudyApi'
import { formatKoreanDate, formatMonthDay } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY = {
  title: '5일 압축 코스',
  examLine: '토익 정기시험 · 11월 8일 일요일',
  conceptCount: 8,
  today: { date: '11.03', day: '화', count: 2, title: '현재시제 · 현재완료의 형태' },
  schedule: [
    { date: '11.04', day: '수', title: '과거시제 · 미래시제', count: 2 },
    { date: '11.05', day: '목', title: '수 일치 · since와 for', count: 2 },
    { date: '11.06', day: '금', title: '계속 용법 · 과거 시점 부사', count: 2 },
  ],
  review: { date: '11.07', day: '토' },
  exam: { date: '11.08', day: '일' },
}

const uniqueConcepts = (tasks) => [
  ...new Map(tasks.flatMap((t) => t.concepts).map((c) => [c.concept_id, c])).values(),
]

// API(계획 + 시험 목표) → 화면 데이터
function toView(plan, goal) {
  const todayYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const byDate = new Map()
  for (const t of plan.tasks) {
    if (!byDate.has(t.due_date)) byDate.set(t.due_date, [])
    byDate.get(t.due_date).push(t)
  }
  const dates = [...byDate.keys()].sort()
  const rows = dates
    .filter((d) => d >= todayYmd)
    .map((d) => {
      const tasks = byDate.get(d)
      const concepts = uniqueConcepts(tasks)
      return {
        ymd: d,
        link: studyUrl('/unit', {
          plan: plan.id,
          task: tasks.find((task) => task.task_type === 'solve' && task.status !== 'completed')?.id,
          material: concepts[0]?.material_id,
          unit: concepts[0]?.unit_id,
        }),
        reviewLink: studyUrl('/review', {
          plan: plan.id,
          task: tasks.find((task) => task.task_type === 'review')?.id,
        }),
        ...formatMonthDay(d),
        title: concepts.map((c) => c.concept_name).join(' · '),
        count: concepts.length,
        reviewOnly: tasks.every((t) => t.task_type === 'review'),
      }
    })
  const last = rows[rows.length - 1]
  const review = last?.reviewOnly && rows.length > 1 ? last : null

  return {
    title: `${dates.length}일 압축 코스`,
    examLine: goal ? `${goal.title} · ${formatKoreanDate(goal.exam_date)}` : '',
    conceptCount: uniqueConcepts(plan.tasks).length,
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
        {!USE_MOCK && <JobActionStatus action={reschedule} />}
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
          {dday && <Chip className="py-[2px] text-[13px]">{dday}</Chip>}
          <p className="text-sm leading-[1.4] tracking-[-0.14px] text-sub">{view.examLine}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-[14px] bg-cool px-4 py-[14px]">
        <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">
          시험일까지, 중요한 것부터 차근차근
        </p>
        <p className="text-[13px] leading-[1.55] tracking-[-0.13px] text-sub">
          확정한 {view.conceptCount}개 개념을 처음부터 배워요. 개념은 더 묶고 문제 수는 줄여, 틀린
          개념을 설명하는 데 집중해요.
        </p>
      </div>

      {/* 오늘 일정 (그라데이션/계획) */}
      {view.today && (
        <Link
          to={view.today.link || '/unit'}
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
            <div className="flex items-center gap-[14px] py-[10px]">
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
            </div>
            <Divider inset={58} />
          </li>
        ))}
        {view.review && (
          <li>
            <Link
              to={USE_MOCK ? '/mock' : view.review.reviewLink}
              className="flex items-start gap-[14px] py-[10px]"
            >
              <span className="flex w-11 flex-col leading-[1.3]">
                <span className="text-sm font-bold">{view.review.date}</span>
                <span className="text-xs text-sub">{view.review.day}</span>
              </span>
              <span className="flex flex-1 flex-col gap-[6px] pt-[34px]">
                <span className="flex items-center gap-[6px]">
                  <img src={iconRefresh} alt="" className="size-[15px]" />
                  <span className="text-sm leading-[1.4] font-medium tracking-[-0.14px]">
                    모의고사 · 재설명 · 문제은행
                  </span>
                </span>
                <span className="pt-4">
                  <Chip tone="secondary">마지막 날 · 실전 점검</Chip>
                </span>
              </span>
            </Link>
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

      {USE_MOCK ? (
        <Button to="/lectures/exam">코스 다시 맞추기</Button>
      ) : (
        <Button onClick={onReschedule} disabled={reschedule.isPending || reschedule.blocked}>
          {reschedule.isPending ? '코스를 다시 맞추는 중이에요…' : '코스 다시 맞추기'}
        </Button>
      )}
      {!USE_MOCK && <JobActionStatus action={reschedule} />}
    </Screen>
  )
}
