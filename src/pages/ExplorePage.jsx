import { useState } from 'react'
import iconClock from '@/assets/icons/clock.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconAward from '@/assets/icons/award-white.svg'
import iconLock from '@/assets/icons/lock-sm.svg'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { PageTitle } from '@/components/Screen'

const keywords = ['토익 RC', '토익 LC', '영문법']
const levels = ['전체', '하', '중', '상']

// 미리보기용 예시 문제 세트
const sets = [
  { title: '토익 시제, 헷갈리는 표현 모음', desc: '현재완료와 과거시제의 쓰임을 구분해요.', level: '중', count: 6 },
  { title: 'since와 for, 알맞은 표현 찾기', desc: '문장을 읽고 시점과 기간에 맞는 말을 골라요.', level: '중', count: 5 },
]

// 14 문제 둘러보기 (출시 예정 · 미리보기)
export default function ExplorePage() {
  const [keyword, setKeyword] = useState(keywords[0])
  const [level, setLevel] = useState('전체')
  const visible = sets.filter((s) => level === '전체' || s.level === level)

  return (
    <Screen header="app" tabs>
      <PageTitle title="다른 시선으로 풀어보기" desc="공개 문제를 모아볼 공간을 준비하고 있어요." />

      <div className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-[14px]">
        <div>
          <Chip tone="white">
            <img src={iconClock} alt="" className="size-[11px]" />
            출시 예정 · 미리보기
          </Chip>
        </div>
        <p className="text-[13px] leading-[1.55] text-sub">
          아래는 공개 문제 탐색 예시예요.
          <br />
          공유와 문제 이용은 출시 후 지원돼요.
        </p>
      </div>

      <div className="flex gap-[6px]">
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKeyword(k)}
            className={`rounded-full px-3 py-[6px] text-[13px] leading-[1.3] ${
              keyword === k ? 'bg-primary font-bold text-white' : 'bg-cool font-medium text-sub'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex gap-[6px]">
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            className={`rounded-md border px-[10px] py-1 text-xs leading-[1.3] ${
              level === l ? 'border-primary-soft bg-primary-soft font-bold text-primary' : 'border-line bg-white font-medium text-sub'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {visible.map((s) => (
        <Card key={s.title} className="gap-2">
          <div className="flex gap-[6px]">
            <Chip>토익</Chip>
            <Chip tone="cool">
              {s.level} · {s.count}문제
            </Chip>
          </div>
          <p className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">{s.title}</p>
          <p className="text-[13px] leading-[1.5] text-sub">{s.desc}</p>
          <button type="button" className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary">
            공개 문제 · 정답 · 해설 미리보기
            <img src={iconRight} alt="" className="size-[14px]" />
          </button>
        </Card>
      ))}

      {/* 인증 기반 탐색 (그라데이션/기록) */}
      <div className="flex flex-col gap-2 rounded-[18px] bg-[linear-gradient(151deg,#5f8ff5_0%,var(--color-secondary)_74%)] p-[18px] text-white">
        <div className="flex items-center gap-[6px]">
          <img src={iconAward} alt="" className="size-4" />
          <span className="rounded-md bg-white/20 px-2 py-[3px] text-[11px] leading-[1.3] font-bold">인증 기반 탐색 · 출시 예정</span>
        </div>
        <p className="text-[17px] leading-[1.4] font-bold tracking-[-0.17px]">토익 900점 이상 인증자가 푼 문제</p>
        <p className="text-xs leading-[1.4] text-white/85">900점 이상 · 인증자 12명 참여 (예시)</p>
      </div>

      <p className="flex items-start gap-[6px] text-xs leading-[1.5] text-muted">
        <img src={iconLock} alt="" className="mt-[2px] size-[13px]" />
        <span>
          공개 문제·정답·해설만 보여요.
          <br />
          만든 사람의 원본 자료와 페이지는 공개하지 않아요.
        </span>
      </p>
    </Screen>
  )
}
