import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import ReportSheet from '@/components/ReportSheet'
import Screen from '@/components/Screen'
import { BANK_SETS, QUIZ } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

const marks = ['①', '②', '③', '④']

// A-13 문제은행 풀이 · 09와 같은 풀이에 출처 라벨 · 마지막에 결과 요약
export default function BankSolvePage() {
  const dday = useDday()
  const [params] = useSearchParams()
  const set = BANK_SETS.find((s) => s.id === params.get('set')) ?? BANK_SETS[0]
  const questions = Array.from({ length: set.count }, (_, i) => QUIZ[(i + 2) % QUIZ.length])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const q = questions[index]
  const picked = answers[index]
  const answered = picked !== undefined
  const correct = questions.filter((x, i) => answers[i] === x.answer).length
  const wrongConcepts = [
    ...new Set(questions.filter((x, i) => answers[i] !== x.answer).map((x) => x.concept)),
  ]

  if (done) {
    return (
      <Screen
        header={{ title: '문제은행 풀이', dday }}
        bottom={
          <>
            <Button to="/teach/prepare">틀린 개념 재설명하기</Button>
            <Button to="/bank" variant="secondary">
              다른 세트 풀기
            </Button>
          </>
        }
        className="gap-5"
      >
        <div className="animate-pop-in flex flex-col items-center gap-2 rounded-[18px] bg-primary-soft py-8">
          <p className="text-sm font-bold text-primary">결과 요약</p>
          <p className="text-[36px] font-bold tracking-[-0.72px]">
            {correct} / {questions.length}
          </p>
          <p className="text-sm text-sub">{set.title}</p>
        </div>
        {wrongConcepts.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="text-sm font-bold">틀린 개념</p>
            <div className="flex flex-wrap gap-2">
              {wrongConcepts.map((c) => (
                <Chip key={c} tone="error">
                  {c}
                </Chip>
              ))}
            </div>
          </section>
        )}
      </Screen>
    )
  }

  return (
    <Screen
      header={{ title: '문제은행 풀이', dday }}
      bottom={
        <Button
          variant={answered ? 'primary' : 'disabled'}
          onClick={() => (index < questions.length - 1 ? setIndex((i) => i + 1) : setDone(true))}
        >
          {index < questions.length - 1 ? '다음 문제' : '결과 보기'}
        </Button>
      }
    >
      <p className="rounded-xl bg-secondary-soft px-4 py-[10px] text-xs leading-[1.5] font-bold text-secondary">
        공개 문제 ·{' '}
        {set.verified ? '토익 900점 이상 인증자 12명이 푼 세트' : `${set.solved}명이 푼 세트`}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold">
          {index + 1} / {questions.length} 문제
        </p>
        <Chip tone={q.level === '상' ? 'error' : 'cool'}>난이도 {q.level}</Chip>
      </div>
      <Card tone="gradient" className="gap-2 rounded-[18px] p-[18px]">
        <p className="text-[13px] font-medium text-sub">{q.prompt}</p>
        <p className="text-[20px] leading-[1.4] font-bold">{q.sentence}</p>
      </Card>
      <ul className="flex flex-col gap-2">
        {q.choices.map((c, i) => {
          const isAnswer = answered && i === q.answer
          const isWrong = answered && i === picked && picked !== q.answer
          return (
            <li key={c}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setAnswers((a) => ({ ...a, [index]: i }))}
                className={`w-full rounded-[14px] py-[14px] pr-[14px] pl-4 text-left text-[15px] ${
                  isAnswer
                    ? 'border-[1.5px] border-primary bg-primary-soft font-bold'
                    : isWrong
                      ? 'border-[1.5px] border-error bg-error-soft font-bold'
                      : 'border border-line font-medium'
                }`}
              >
                {marks[i]} {c}
              </button>
            </li>
          )
        })}
      </ul>
      {answered && (
        <div className="animate-pop-in flex flex-col gap-1 rounded-[14px] bg-cool px-4 py-[14px]">
          <p className="text-xs font-bold text-sub">만든 사람의 해설</p>
          <p className="text-sm leading-[1.6]">{q.explain}</p>
        </div>
      )}
      <p className="flex items-center justify-center gap-[6px] text-xs">
        <span className="text-muted">문제에 오류가 있나요?</span>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="font-bold text-sub underline"
        >
          문제 신고
        </button>
      </p>
      <ReportSheet open={reportOpen} kind="question" onClose={() => setReportOpen(false)} />
    </Screen>
  )
}
