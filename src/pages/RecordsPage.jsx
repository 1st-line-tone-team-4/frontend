import { Link } from 'react-router-dom'
import iconRight from '@/assets/icons/right-primary.svg'
import iconDot from '@/assets/icons/dot-secondary.svg'
import iconRightMuted from '@/assets/icons/right-muted-16.svg'
import iconAward from '@/assets/icons/award-muted.svg'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'

const weekly = [
  ['4개', '읽은 개념'],
  ['20문제', '푼 문제'],
  ['3회', '마친 설명'],
]

const weak = [
  { title: '현재완료', desc: '과거 시점 부사 사용 · 2회' },
  { title: '시제의 기초', desc: 'since와 for 구분 · 2회' },
]

// 15 기록
export default function RecordsPage() {
  return (
    <Screen header="app" tabs className="gap-[18px] pb-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px]">설명할수록 선명해지는 실력</h1>
        <p className="text-sm leading-[1.4] tracking-[-0.14px] text-sub">차곡차곡 쌓인 나의 학습 기록</p>
      </div>

      {/* 이번 주 통계 (그라데이션/기록) */}
      <div className="flex flex-col gap-[14px] rounded-[18px] bg-[linear-gradient(151deg,#5f8ff5_0%,var(--color-secondary)_74%)] px-5 py-[18px] text-white">
        <p className="text-[13px] leading-[1.3] font-bold text-white/85">이번 주에 쌓은 공부</p>
        <div className="flex items-center">
          {weekly.map(([v, k], i) => (
            <div key={k} className="flex flex-1 items-center">
              {i > 0 && <span className="h-8 w-px bg-white/30" />}
              <div className="flex flex-1 flex-col items-center">
                <span className="text-[22px] leading-[1.25] font-bold tracking-[-0.44px]">{v}</span>
                <span className="text-xs leading-[1.3] text-white/82">{k}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 재설명 성장 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Chip>이전 학습 · 재설명 완료</Chip>
          <span className="text-xs leading-[1.3] text-sub">시제의 기초 · 11월 2일</span>
        </div>
        <p className="flex items-baseline gap-[10px] pt-1 leading-[1.2] font-bold">
          <span className="text-[22px] tracking-[-0.44px] text-muted">58%</span>
          <span className="text-base font-medium text-muted">→</span>
          <span className="text-[30px] tracking-[-0.6px] text-primary">83%</span>
        </p>
        <div className="flex flex-col gap-[6px]">
          <div className="h-[6px] overflow-hidden rounded-full bg-cool">
            <div className="h-full w-[58%] rounded-full bg-muted" />
          </div>
          <div className="h-[6px] overflow-hidden rounded-full bg-cool">
            <div className="h-full w-[83%] rounded-full bg-primary" />
          </div>
        </div>
        <p className="text-[13px] leading-[1.4] font-medium">첫 설명 → 완료한 재설명 · 25%p 증가</p>
        <Link to="/report" className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary">
          두 설명과 확인 항목 비교하기
          <img src={iconRight} alt="" className="size-[14px]" />
        </Link>
      </section>

      <Divider />

      {/* 오늘 설명 */}
      <section className="flex flex-col gap-[6px]">
        <div>
          <Chip tone="cool">오늘 · 첫 설명 완료</Chip>
        </div>
        <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">현재완료 · 설명률 58%</p>
        <p className="flex items-center gap-[6px] text-[13px] leading-[1.4]">
          <span className="text-sub">재설명 전이에요.</span>
          <Link to="/report" className="flex items-center gap-[2px] font-bold text-primary">
            약점 리포트 이어보기
            <img src={iconRight} alt="" className="size-[14px]" />
          </Link>
        </p>
      </section>

      <Divider />

      {/* 자주 놓치는 개념 */}
      <section>
        <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">자주 놓치는 개념</h2>
        <ul>
          {weak.map((w) => (
            <li key={w.title}>
              <Link to="/study" className="flex items-center gap-[10px] py-3">
                <img src={iconDot} alt="" className="size-[6px]" />
                <span className="flex flex-1 flex-col leading-[1.4]">
                  <span className="text-sm font-bold">{w.title}</span>
                  <span className="text-xs text-sub">{w.desc}</span>
                </span>
                <img src={iconRightMuted} alt="" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/records/verify" className="flex items-center gap-3 rounded-[14px] bg-cool px-4 py-[14px]">
        <img src={iconAward} alt="" className="size-5" />
        <span className="flex flex-1 flex-col gap-[2px]">
          <span className="flex items-center gap-[6px]">
            <span className="text-sm leading-[1.4] font-bold text-sub">점수 인증하기</span>
            <Chip tone="white" className="text-muted">
              출시 예정
            </Chip>
          </span>
          <span className="text-xs leading-[1.4] text-muted">학습 기록에 시험 결과도 남길 수 있게 준비해요.</span>
        </span>
      </Link>
    </Screen>
  )
}
