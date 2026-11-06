import { useState } from 'react'
import iconAlert from '@/assets/icons/alert-error.svg'
import iconTarget from '@/assets/icons/target.svg'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { PageTitle } from '@/components/Screen'
import Source from '@/components/Source'

const results = [
  { title: '현재완료 형태 외 4개', page: 'p.24', tone: 'primary', label: '설명됨 · 5개' },
  { title: '계속 용법·예시 외 2개', page: 'p.24–25', tone: 'secondary', label: '부분 설명 · 4개' },
  { title: 'since·for 구분', page: 'p.25', tone: 'cool', label: '누락 · 2개' },
  { title: '과거 시점 부사 사용', page: 'p.24', tone: 'error', label: '오류 · 1개' },
]

// 12 약점 리포트
export default function ReportPage() {
  const [nextDone, setNextDone] = useState(false)

  return (
    <Screen
      header={{ title: '약점 리포트', dday: 'D-5' }}
      bottom={
        <>
          <Button to="/teach/prepare">다시 설명하기</Button>
          <Button to="/quiz" variant="secondary">
            보충 문제 풀기
          </Button>
        </>
      }
      className="gap-5"
    >
      <PageTitle title="현재완료를 한 번 더 정리해요" desc="방금 마친 설명 · 현재완료" />

      {/* 설명률 (그라데이션/기록) */}
      <div className="flex flex-col gap-[6px] rounded-[18px] bg-[linear-gradient(145deg,#5f8ff5_0%,var(--color-secondary)_74%)] px-5 py-[18px] text-white">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-[2px] leading-[1.4]">
            <p className="text-sm font-bold">확인 항목 설명률</p>
            <p className="text-xs text-white/82">이번 개념의 확정 항목 12개 기준</p>
          </div>
          <p className="text-[38px] leading-[1.1] font-bold tracking-[-0.76px]">58%</p>
        </div>
        <div className="pt-2 pb-1">
          <div className="h-[6px] overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-[58%] rounded-full bg-white" />
          </div>
        </div>
        <p className="text-[11px] leading-[1.55] text-white/85">
          설명 2점 · 부분 1점 · 누락·오류 0점
          <br />
          14 / 24점 = 58% (반올림) · 시험 점수가 아니에요
        </p>
      </div>

      <section>
        <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">무엇을 설명했고, 무엇이 빠졌나요?</h2>
        <ul>
          {results.map((r, i) => (
            <li key={r.title}>
              {i > 0 && <Divider />}
              <div className="flex items-center gap-[10px] py-3">
                <div className="flex flex-1 flex-col gap-[2px]">
                  <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">{r.title}</p>
                  <Source>토익 문법 정리.pdf {r.page}</Source>
                </div>
                <Chip tone={r.tone}>{r.label}</Chip>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2 rounded-[14px] bg-cool p-4">
        <div>
          <Chip tone="error">
            <img src={iconAlert} alt="" className="size-[11px]" />내 설명에서 발견한 오류
          </Chip>
        </div>
        <p className="text-sm leading-[1.55] font-medium text-sub">“yesterday 같은 과거 시점 부사와도 쓸 수 있어요.”</p>
        <p className="text-[15px] leading-[1.45] font-bold tracking-[-0.15px]">분명한 과거 시점에는 과거시제를 써요.</p>
        <p className="text-[13px] leading-[1.55] text-sub">
          현재완료는 yesterday, last year처럼 과거 시점이 분명한 부사와 함께 쓰지 않아요.
        </p>
        <Source>토익 문법 정리.pdf p.24</Source>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] bg-primary-soft px-4 py-[14px]">
        <p className="flex items-center gap-[6px] text-sm leading-[1.4] font-bold text-primary">
          <img src={iconTarget} alt="" className="size-4" />
          다음에는 이것 하나만
        </p>
        <label className="flex cursor-pointer items-start gap-[10px]">
          <input
            type="checkbox"
            checked={nextDone}
            onChange={(e) => setNextDone(e.target.checked)}
            className="mt-[2px] size-[18px] shrink-0 appearance-none rounded-[5px] border-[1.5px] border-primary bg-white checked:bg-primary"
          />
          <span className={`text-sm leading-[1.55] font-medium ${nextDone ? 'text-sub line-through' : ''}`}>
            자료 p.24를 읽고 현재완료와 과거시제의 차이를 다시 설명해요.
          </span>
        </label>
      </div>

      <p className="flex items-center justify-center gap-[6px] text-xs leading-[1.3]">
        <span className="text-muted">재설명은 이번 설명과 연결해 비교해요.</span>
        <button type="button" className="font-bold text-sub underline">
          평가 신고
        </button>
      </p>
    </Screen>
  )
}
