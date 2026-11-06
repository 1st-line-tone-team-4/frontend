import { Link } from 'react-router-dom'
import iconRightWhite from '@/assets/icons/right-white.svg'
import iconBook from '@/assets/icons/book-sm.svg'
import iconRefresh from '@/assets/icons/refresh.svg'
import iconFlag from '@/assets/icons/flag.svg'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'

const schedule = [
  { date: '11.04', day: '수', title: '과거시제 · 미래시제', count: 2 },
  { date: '11.05', day: '목', title: '수 일치 · since와 for', count: 2 },
  { date: '11.06', day: '금', title: '계속 용법 · 과거 시점 부사', count: 2 },
]

// 06 계획
export default function PlanPage() {
  return (
    <Screen header="app" tabs className="gap-[10px] pt-[6px] pb-3">
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-[26px] leading-[1.3] font-bold tracking-[-0.78px]">5일 압축 코스</h1>
        <div className="flex items-center gap-2">
          <Chip className="py-[2px] text-[13px]">D-5</Chip>
          <p className="text-sm leading-[1.4] tracking-[-0.14px] text-sub">토익 정기시험 · 11월 8일 일요일</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-[14px] bg-cool px-4 py-[14px]">
        <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">시험일까지, 중요한 것부터 차근차근</p>
        <p className="text-[13px] leading-[1.55] tracking-[-0.13px] text-sub">
          확정한 8개 개념을 처음부터 배워요. 개념은 더 묶고 문제 수는 줄여, 틀린 개념을 설명하는 데 집중해요.
        </p>
      </div>

      {/* 오늘 일정 (그라데이션/계획) */}
      <Link
        to="/study"
        className="flex flex-col gap-1 rounded-[18px] bg-[linear-gradient(158deg,#4e68b0_0%,var(--color-logo-navy)_74%)] py-4 pr-[18px] pl-5 text-white"
      >
        <span className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-[13px] leading-[1.3] font-bold text-white/85">11.03 화</span>
            <span className="rounded-md bg-white/18 px-2 py-[3px] text-[11px] leading-[1.3] font-bold">오늘 · 개념 2개</span>
          </span>
          <img src={iconRightWhite} alt="" className="size-[18px]" />
        </span>
        <span className="text-lg leading-[1.4] font-bold tracking-[-0.36px]">현재시제 · 현재완료의 형태</span>
      </Link>

      <ul className="flex flex-col">
        {schedule.map((s) => (
          <li key={s.date}>
            <div className="flex items-center gap-[14px] py-[10px]">
            <span className="flex w-11 flex-col leading-[1.3]">
              <span className="text-sm font-bold">{s.date}</span>
              <span className="text-xs text-sub">{s.day}</span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-[6px]">
              <img src={iconBook} alt="" className="size-[15px]" />
              <span className="text-sm leading-[1.4] font-medium tracking-[-0.14px]">{s.title}</span>
            </span>
            <Chip tone="cool">개념 {s.count}개</Chip>
            </div>
            <Divider inset={58} />
          </li>
        ))}
        <li className="flex items-start gap-[14px] py-[10px]">
          <span className="flex w-11 flex-col leading-[1.3]">
            <span className="text-sm font-bold">11.07</span>
            <span className="text-xs text-sub">토</span>
          </span>
          <span className="flex flex-1 flex-col gap-[6px] pt-[34px]">
            <span className="flex items-center gap-[6px]">
              <img src={iconRefresh} alt="" className="size-[15px]" />
              <span className="text-sm leading-[1.4] font-medium tracking-[-0.14px]">틀린 개념과 설명 다시 보기</span>
            </span>
            <span className="pt-4">
              <Chip tone="secondary">마지막 날 · 전체 복습</Chip>
            </span>
          </span>
        </li>
      </ul>

      <div className="flex gap-[10px] pt-[2px]">
        <img src={iconFlag} alt="" className="size-4 shrink-0" />
        <div className="flex flex-col gap-[2px] leading-[1.4]">
          <p className="text-[13px] font-bold">11.08 일 · 시험 당일</p>
          <p className="text-xs text-sub">시험 날짜나 개념이 바뀌면 코스를 다시 맞춰요.</p>
        </div>
      </div>

      <Button to="/lectures/exam">코스 다시 맞추기</Button>
    </Screen>
  )
}
