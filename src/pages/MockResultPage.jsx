import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { ChevronDownIcon } from '@/components/icons'
import Screen, { BottomNote } from '@/components/Screen'
import SourceChip from '@/components/SourceChip'
import { MOCK_QUESTIONS, MOCK_RESULT } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

const marks = ['①', '②', '③', '④']

// A-11 모의고사 결과
export default function MockResultPage() {
  const dday = useDday()
  const { state } = useLocation()
  const [open, setOpen] = useState(null)

  const correct = state?.correct ?? MOCK_RESULT.correct
  const total = state?.total ?? MOCK_RESULT.total
  const minutes = state ? Math.max(1, Math.round(state.seconds / 60)) : MOCK_RESULT.minutes
  const rate = Math.round((correct / total) * 100)
  const answers = state?.answers
  // 실제 답이 있으면 그 오답, 없으면 시안용 오답 6개
  const wrong = MOCK_QUESTIONS.map((q, i) => ({
    ...q,
    i,
    picked: answers ? answers[i] : (q.answer + 1) % 4,
  })).filter((q, i) => (answers ? answers[i] !== q.answer : [2, 4, 9, 12, 14, 19].includes(i)))
  const diff = correct - MOCK_RESULT.prev.score

  return (
    <Screen
      header={{ title: '모의고사 결과', dday }}
      bottom={
        <>
          <Button to="/teach/prepare">틀린 개념 재설명하기</Button>
          <div className="grid w-full grid-cols-3 gap-2">
            <Button
              to="/quiz/solve?kind=retry&n=6"
              variant="secondary"
              className="h-11 text-[13px]"
            >
              오답 다시 풀기
            </Button>
            <Button to="/bank" variant="secondary" className="h-11 text-[13px]">
              비슷한 문제
            </Button>
            <Button to="/unit" variant="secondary" className="h-11 text-[13px]">
              개념 다시 보기
            </Button>
          </div>
        </>
      }
      className="gap-6"
    >
      <div className="flex flex-col gap-2 rounded-[18px] bg-[linear-gradient(145deg,#5f8ff5_0%,var(--color-secondary)_74%)] px-5 py-5 text-white">
        <p className="text-sm font-bold text-white/85">모의고사 점수</p>
        <div className="flex items-end justify-between">
          <p className="text-[40px] leading-[1.1] font-bold tracking-[-0.8px]">
            {correct}
            <span className="text-xl text-white/80"> / {total}</span>
          </p>
          <div className="flex flex-col items-end text-xs text-white/85">
            <span className="text-lg font-bold text-white">{rate}%</span>
            <span>걸린 시간 {minutes}분</span>
          </div>
        </div>
        <p className="text-xs text-white/85">
          지난 모의고사 {MOCK_RESULT.prev.score} / {MOCK_RESULT.prev.total} →{' '}
          {diff >= 0 ? `${diff}문제 더 맞혔어요` : `${-diff}문제 덜 맞혔어요`}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">개념별 정답률</h2>
        <ul className="flex flex-col gap-2">
          {MOCK_RESULT.byConcept.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <span className="w-[92px] shrink-0 truncate text-[13px] text-sub">{c.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-cool">
                <span
                  className={`block h-full rounded-full ${c.rate < 60 ? 'bg-error' : 'bg-primary'}`}
                  style={{ width: `${c.rate}%` }}
                />
              </span>
              <span className="w-9 text-right text-xs font-bold tabular-nums">{c.rate}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">약한 개념 3개</h2>
        {MOCK_RESULT.weak.map((w, i) => (
          <div
            key={w.name}
            className="flex items-center gap-3 rounded-xl border border-line px-4 py-3"
          >
            <span className="text-sm font-bold text-error">{i + 1}</span>
            <span className="flex-1 text-sm font-bold">{w.name}</span>
            <SourceChip page={w.page} />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-base font-bold">오답 {wrong.length}개</h2>
        <ul className="divide-y divide-line">
          {wrong.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => setOpen(open === q.i ? null : q.i)}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                <Chip tone="error">{q.i + 1}번</Chip>
                <span className="flex-1 truncate text-sm">{q.sentence}</span>
                <ChevronDownIcon
                  size={16}
                  className={`text-muted transition ${open === q.i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === q.i && (
                <div className="mb-3 flex flex-col gap-2 rounded-xl bg-cool px-4 py-3 text-[13px] leading-[1.6]">
                  <p>
                    내 답{' '}
                    {q.picked === undefined ? '없음' : `${marks[q.picked]} ${q.choices[q.picked]}`}{' '}
                    · 정답{' '}
                    <b>
                      {marks[q.answer]} {q.choices[q.answer]}
                    </b>
                  </p>
                  <p className="text-sub">{q.explain}</p>
                  <SourceChip page={q.page} label={`근거 p.${q.page}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <BottomNote>실제 시험 점수 예측이 아니에요.</BottomNote>
    </Screen>
  )
}
