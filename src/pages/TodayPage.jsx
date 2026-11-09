import { Link } from 'react-router-dom'
import iconRightWhite from '@/assets/icons/right-white.svg'
import iconCheck from '@/assets/icons/check-primary-14.svg'
import iconRight from '@/assets/icons/right-primary-16.svg'
import iconBookmark from '@/assets/icons/bookmark.svg'
import iconRightMuted from '@/assets/icons/right-muted.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'
import { useDday, useToday, useWeaknesses } from '@/hooks/useStudyApi'
import { toPercent } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY = {
  unitLabel: '오늘의 단원 · 단원 3',
  unitTitle: '현재완료 · 계속 용법',
  unitMeta: '토익 문법 정리.pdf · 약 40분',
  progress: 33,
  stats: [
    ['5일', '연속 학습'],
    ['76%', '평균 커버리지'],
    ['3개', '남은 약점'],
  ],
  steps: [
    {
      id: 's1',
      title: '문제 풀이',
      desc: '5문제 중 3문제 정답',
      status: 'done',
      to: '/quiz/solve',
    },
    {
      id: 's2',
      title: '약점 설명',
      desc: '과거 시점 부사를 학생 AI에게',
      status: 'current',
      to: '/teach',
    },
    { id: 's3', title: '보완', desc: '보충 문제 · 재설명', status: 'waiting', to: '/report' },
  ],
  weakLink: '자주 놓친 개념 · 과거 시점 부사 2회',
}

const TASK_LABEL = { solve: '문제 풀이', teach_back: '약점 설명', review: '보완' }
const TASK_LINK = { solve: '/quiz', teach_back: '/teach/prepare', review: '/report' }

// API(/today + /records/weaknesses) → 화면 데이터
function toView(today, weaknesses = []) {
  const tasks = [...today.tasks].sort((a, b) => a.display_order - b.display_order)
  const currentIdx = tasks.findIndex((t) => t.status !== 'completed' && t.status !== 'skipped')
  const concepts = [
    ...new Map(tasks.flatMap((t) => t.concepts).map((c) => [c.concept_id, c])).values(),
  ]
  const done = tasks.filter((t) => t.status === 'completed').length
  const coverages = weaknesses.map((w) => w.latest_coverage).filter((v) => v !== null)
  const avg = coverages.length
    ? `${toPercent(coverages.reduce((a, b) => a + b, 0) / coverages.length)}%`
    : '-'
  const topWeak = [...weaknesses].sort((a, b) => b.incorrect_attempts - a.incorrect_attempts)[0]

  return {
    unitLabel: `오늘의 단원${concepts[0] ? ` · ${concepts[0].unit_title}` : ''}`,
    unitTitle: concepts.map((c) => c.concept_name).join(' · ') || '오늘 학습',
    unitMeta: `개념 ${concepts.length}개`,
    progress: toPercent(today.progress) ?? 0,
    stats: [
      [`${done}/${tasks.length}`, '오늘 완료'],
      [avg, '평균 커버리지'],
      [`${weaknesses.length}개`, '남은 약점'],
    ],
    steps: tasks.map((t, i) => ({
      id: t.id,
      title: TASK_LABEL[t.task_type] ?? t.title,
      desc:
        t.task_type === 'solve'
          ? `${t.target_count}문제 중 ${t.completed_count}문제 완료`
          : t.title,
      status: t.status === 'completed' ? 'done' : i === currentIdx ? 'current' : 'waiting',
      to: `${TASK_LINK[t.task_type]}?task=${t.id}`,
    })),
    weakLink:
      topWeak && topWeak.incorrect_attempts > 0
        ? `자주 놓친 개념 · ${topWeak.concept_name} ${topWeak.incorrect_attempts}회`
        : null,
  }
}

function StepRow({ step, index }) {
  const done = step.status === 'done'
  const current = step.status === 'current'
  return (
    <Link to={step.to} className="flex items-center gap-[14px] py-[11px]">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-[14px] text-[13px] leading-[1.2] font-bold ${
          done
            ? 'bg-primary-soft'
            : current
              ? 'bg-primary text-white'
              : 'border-[1.5px] border-line text-muted'
        }`}
      >
        {done ? <img src={iconCheck} alt="완료" className="size-[14px]" /> : index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.4]">
        <span
          className={`text-[15px] tracking-[-0.15px] ${step.status === 'waiting' ? 'font-medium text-sub' : 'font-bold'}`}
        >
          {step.title}
        </span>
        <span
          className={`text-xs tracking-[-0.12px] ${step.status === 'waiting' ? 'text-muted' : 'text-sub'}`}
        >
          {step.desc}
        </span>
      </span>
      <span
        className={`text-xs leading-[1.3] font-bold ${step.status === 'waiting' ? 'text-muted' : 'text-primary'}`}
      >
        {done ? '완료' : current ? '진행 중' : '대기'}
      </span>
      {current && <img src={iconRight} alt="" className="size-4" />}
    </Link>
  )
}

// 05 오늘
export default function TodayPage() {
  const today = useToday()
  const weaknesses = useWeaknesses()
  const dday = useDday()

  const view = USE_MOCK
    ? DUMMY
    : today.data?.tasks.length
      ? toView(today.data, weaknesses.data)
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

  const current = view.steps.find((s) => s.status === 'current')
  const doneCount = view.steps.filter((s) => s.status === 'done').length

  return (
    <Screen header="app" tabs className="gap-0 pt-[14px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm leading-[1.4] font-medium tracking-[-0.14px] text-sub">
            선생님, 오늘도 가르쳐 볼까요?
          </p>
          {dday && <Chip className="text-[13px]">{dday}</Chip>}
        </div>
        <h1 className="text-[26px] leading-[1.3] font-bold tracking-[-0.78px]">
          오늘도, 내 말로 한 걸음
        </h1>
      </div>

      {/* 오늘의 단원 (그라데이션/오늘) */}
      <Link
        to="/study"
        className="mt-[23px] flex flex-col gap-1 rounded-[18px] bg-[linear-gradient(144deg,var(--color-logo-blue)_0%,var(--color-primary)_74%)] px-5 py-4 text-white"
      >
        <span className="flex items-center justify-between">
          <span className="text-xs leading-[1.3] font-bold tracking-[-0.12px] text-white/85">
            {view.unitLabel}
          </span>
          <img src={iconRightWhite} alt="" className="size-[18px]" />
        </span>
        <span className="text-[19px] leading-[1.35] font-bold tracking-[-0.38px]">
          {view.unitTitle}
        </span>
        <span className="text-[13px] leading-[1.4] tracking-[-0.13px] text-white/82">
          {view.unitMeta}
        </span>
        <span className="flex justify-between pt-3 text-xs leading-[1.3] tracking-[-0.12px]">
          <span className="font-medium text-white/85">
            오늘 학습 {doneCount} / {view.steps.length} 단계
          </span>
          <span className="font-bold">{view.progress}%</span>
        </span>
        <span className="mt-[6px] h-1 overflow-hidden rounded-full bg-white/30">
          <span
            className="block h-full rounded-full bg-white"
            style={{ width: `${view.progress}%` }}
          />
        </span>
      </Link>

      {/* 학습 지표 */}
      <div className="mt-4 flex items-center pb-4">
        {view.stats.map(([v, k], i) => (
          <div
            key={k}
            className={`flex flex-1 flex-col items-center leading-[1.3] ${i > 0 ? 'border-l border-line' : ''}`}
          >
            <span className="text-xl font-bold tracking-[-0.4px]">{v}</span>
            <span className="text-xs tracking-[-0.12px] text-sub">{k}</span>
          </div>
        ))}
      </div>
      <hr className="border-line" />

      {/* 오늘의 단계 */}
      <section className="mt-[22px] flex flex-col gap-[2px]">
        <div className="flex justify-between pb-[6px] leading-[1.3]">
          <h2 className="text-base font-bold tracking-[-0.16px]">오늘의 {view.steps.length}단계</h2>
          <span className="text-[13px] font-medium tracking-[-0.13px] text-sub">
            {doneCount} / {view.steps.length} 완료
          </span>
        </div>
        <ul className="flex flex-col">
          {view.steps.map((s, i) => (
            <li key={s.id}>
              {i > 0 && <Divider inset={42} />}
              <StepRow step={s} index={i} />
            </li>
          ))}
        </ul>
      </section>

      {current ? (
        <Button to={current.to} className="mt-[14px]">
          이어서 하기 · {current.title}
        </Button>
      ) : (
        <Button to="/records" variant="secondary" className="mt-[14px]">
          오늘 학습 완료 · 기록 보기
        </Button>
      )}
      {view.weakLink && (
        <Link
          to="/records"
          className="mt-[14px] flex items-center justify-center gap-2 text-[13px] leading-[1.4] font-medium tracking-[-0.13px] text-sub"
        >
          <img src={iconBookmark} alt="" className="size-[15px]" />
          {view.weakLink}
          <img src={iconRightMuted} alt="" className="size-[14px]" />
        </Link>
      )}
    </Screen>
  )
}
