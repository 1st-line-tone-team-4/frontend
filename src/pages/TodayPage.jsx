import { Link } from 'react-router-dom'
import iconRightWhite from '@/assets/icons/right-white.svg'
import iconCheck from '@/assets/icons/check-primary-14.svg'
import iconRight from '@/assets/icons/right-primary-16.svg'
import iconBookmark from '@/assets/icons/bookmark.svg'
import iconRightMuted from '@/assets/icons/right-muted.svg'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'

const stats = [
  ['5일', '연속 학습'],
  ['76%', '평균 커버리지'],
  ['3개', '남은 약점'],
]

const steps = [
  { title: '문제 풀이', desc: '5문제 중 3문제 정답', status: 'done', to: '/quiz/solve' },
  { title: '약점 설명', desc: '과거 시점 부사를 학생 AI에게', status: 'current', to: '/teach' },
  { title: '보완', desc: '보충 문제 · 재설명', status: 'waiting', to: '/report' },
]

function StepRow({ step, index }) {
  const done = step.status === 'done'
  const current = step.status === 'current'
  return (
    <Link to={step.to} className="flex items-center gap-[14px] py-[11px]">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-[14px] text-[13px] leading-[1.2] font-bold ${
          done ? 'bg-primary-soft' : current ? 'bg-primary text-white' : 'border-[1.5px] border-line text-muted'
        }`}
      >
        {done ? <img src={iconCheck} alt="완료" className="size-[14px]" /> : index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.4]">
        <span className={`text-[15px] tracking-[-0.15px] ${step.status === 'waiting' ? 'font-medium text-sub' : 'font-bold'}`}>
          {step.title}
        </span>
        <span className={`text-xs tracking-[-0.12px] ${step.status === 'waiting' ? 'text-muted' : 'text-sub'}`}>
          {step.desc}
        </span>
      </span>
      <span className={`text-xs leading-[1.3] font-bold ${step.status === 'waiting' ? 'text-muted' : 'text-primary'}`}>
        {done ? '완료' : current ? '진행 중' : '대기'}
      </span>
      {current && <img src={iconRight} alt="" className="size-4" />}
    </Link>
  )
}

// 05 오늘
export default function TodayPage() {
  return (
    <Screen header="app" tabs className="gap-0 pt-[14px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm leading-[1.4] font-medium tracking-[-0.14px] text-sub">선생님, 오늘도 가르쳐 볼까요?</p>
          <Chip className="text-[13px]">D-5</Chip>
        </div>
        <h1 className="text-[26px] leading-[1.3] font-bold tracking-[-0.78px]">오늘도, 내 말로 한 걸음</h1>
      </div>

      {/* 오늘의 단원 (그라데이션/오늘) */}
      <Link
        to="/study"
        className="mt-[23px] flex flex-col gap-1 rounded-[18px] bg-[linear-gradient(144deg,var(--color-logo-blue)_0%,var(--color-primary)_74%)] px-5 py-4 text-white"
      >
        <span className="flex items-center justify-between">
          <span className="text-xs leading-[1.3] font-bold tracking-[-0.12px] text-white/85">오늘의 단원 · 단원 3</span>
          <img src={iconRightWhite} alt="" className="size-[18px]" />
        </span>
        <span className="text-[19px] leading-[1.35] font-bold tracking-[-0.38px]">현재완료 · 계속 용법</span>
        <span className="text-[13px] leading-[1.4] tracking-[-0.13px] text-white/82">토익 문법 정리.pdf · 약 40분</span>
        <span className="flex justify-between pt-3 text-xs leading-[1.3] tracking-[-0.12px]">
          <span className="font-medium text-white/85">오늘 학습 1 / 3 단계</span>
          <span className="font-bold">33%</span>
        </span>
        <span className="mt-[6px] h-1 overflow-hidden rounded-full bg-white/30">
          <span className="block h-full w-1/3 rounded-full bg-white" />
        </span>
      </Link>

      {/* 학습 지표 */}
      <div className="mt-4 flex items-center pb-4">
        {stats.map(([v, k], i) => (
          <div key={k} className={`flex flex-1 flex-col items-center leading-[1.3] ${i > 0 ? 'border-l border-line' : ''}`}>
            <span className="text-xl font-bold tracking-[-0.4px]">{v}</span>
            <span className="text-xs tracking-[-0.12px] text-sub">{k}</span>
          </div>
        ))}
      </div>
      <hr className="border-line" />

      {/* 오늘의 3단계 */}
      <section className="mt-[22px] flex flex-col gap-[2px]">
        <div className="flex justify-between pb-[6px] leading-[1.3]">
          <h2 className="text-base font-bold tracking-[-0.16px]">오늘의 3단계</h2>
          <span className="text-[13px] font-medium tracking-[-0.13px] text-sub">1 / 3 완료</span>
        </div>
        <ul className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.title}>
              {i > 0 && <Divider inset={42} />}
              <StepRow step={s} index={i} />
            </li>
          ))}
        </ul>
      </section>

      <Button to="/teach" className="mt-[14px]">
        이어서 하기 · 약점 설명
      </Button>
      <Link to="/report" className="mt-[14px] flex items-center justify-center gap-2 text-[13px] leading-[1.4] font-medium tracking-[-0.13px] text-sub">
        <img src={iconBookmark} alt="" className="size-[15px]" />
        자주 놓친 개념 · 과거 시점 부사 2회
        <img src={iconRightMuted} alt="" className="size-[14px]" />
      </Link>
    </Screen>
  )
}
