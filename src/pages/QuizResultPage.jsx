import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { ChevronDownIcon } from '@/components/icons'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import SourceChip from '@/components/SourceChip'
import { QUIZ } from '@/data/flow'
import { useDday, useQuestionAttempts, useQuestionSet, useToday } from '@/hooks/useStudyApi'

const marks = ['①', '②', '③', '④']

// 목 모드에서 바로 열었을 때 쓰는 결과 (10문제 중 6문제 정답)
const FALLBACK = Array.from({ length: 10 }, (_, i) => {
  const q = QUIZ[i % QUIZ.length]
  const correct = ![2, 4, 7, 9].includes(i)
  return {
    ordinal: i + 1,
    concept: q.concept,
    level: q.level,
    sentence: q.sentence,
    choices: q.choices.map((text, k) => ({ id: `o${k}`, text })),
    answerId: `o${q.answer}`,
    pickedId: correct ? `o${q.answer}` : `o${(q.answer + 1) % 4}`,
    isCorrect: correct,
    explanation: q.explain,
    page: q.page,
  }
})

const LEVEL = { easy: '하', medium: '중', hard: '상' }

// 문제 세트(GET /question-sets/{id})의 최신 채점 결과 → 화면 데이터
function toAnswers(set, conceptName) {
  return [...set.items]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((it) => {
      const q = it.question
      const at = it.latest_attempt
      const result = at?.status === 'graded' ? at.result : null
      return {
        questionId: q.id,
        conceptVersionId: q.concept_version_ids[0],
        ordinal: it.ordinal,
        concept: conceptName(q.concept_version_ids[0]),
        level: LEVEL[q.difficulty],
        sentence: q.prompt,
        choices: q.options,
        answerId: result?.correct_answer.selected_option_ids?.[0],
        answerText: result?.correct_answer.text,
        pickedId: at?.answer.selected_option_ids?.[0],
        myText: at?.answer.text,
        isCorrect: Boolean(result?.is_correct),
        explanation: [result?.feedback, result?.explanation].filter(Boolean).join(' '),
        page: result?.evidence[0]?.page_number,
      }
    })
}

// 문제 하나의 풀이 기록 (GET /questions/{id}/attempts)
function AttemptHistory({ questionId }) {
  const attempts = useQuestionAttempts(questionId)
  const list = attempts.data ?? []
  if (list.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[11px] font-bold text-muted">풀이 기록 {list.length}회</span>
      {list.map((h) => (
        <Chip key={h.id} tone={h.result?.is_correct ? 'primary' : h.result ? 'error' : 'cool'}>
          {h.result ? (h.result.is_correct ? 'O' : 'X') : '채점 중'}
        </Chip>
      ))}
    </div>
  )
}

// A-04 개념 확인 결과 (A-08 심화 문제 결과도 이 화면)
export default function QuizResultPage() {
  const dday = useDday()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const advanced = params.get('kind') === 'advanced'
  const [openId, setOpenId] = useState(null)

  const setQuery = useQuestionSet()
  const today = useToday()
  const conceptName = (versionId) =>
    today.data?.tasks.flatMap((t) => t.concepts).find((c) => c.concept_version_id === versionId)
      ?.concept_name ?? '개념'
  const source = USE_MOCK
    ? (state?.answers ?? FALLBACK)
    : setQuery.data
      ? toAnswers(setQuery.data, conceptName)
      : []
  // 문제를 푼 다음 단계는 '설명하기' (계획: 문제 풀기 → 설명하기 → 복습하기)
  // 그래서 개념을 다시 볼 때도 문제를 또 만들지 않고 설명하기로 이어지게 해요 (?from=quiz)
  const firstWrong = source.find((a) => !a.isCorrect && a.conceptVersionId)
  const studyLink = firstWrong
    ? `/study?concept=${firstWrong.conceptVersionId}&from=quiz`
    : '/study?from=quiz'
  const answers = source.map((a, i) => ({
    ...a,
    ordinal: a.ordinal ?? i + 1,
  }))
  const correct = answers.filter((a) => a.isCorrect).length
  const byLevel = ['하', '중', '상'].map((lv) => {
    const xs = answers.filter((a) => a.level === lv)
    return {
      lv,
      total: xs.length,
      rate: xs.length ? Math.round((xs.filter((a) => a.isCorrect).length / xs.length) * 100) : null,
    }
  })

  // 틀린 개념을 틀린 횟수 순으로 · 상 난이도 오답은 강조
  const weakMap = new Map()
  answers
    .filter((a) => !a.isCorrect)
    .forEach((a) => {
      const w = weakMap.get(a.concept) ?? { name: a.concept, wrong: 0, hard: false, page: a.page }
      w.wrong += 1
      w.hard ||= a.level === '상'
      weakMap.set(a.concept, w)
    })
  const weak = [...weakMap.values()].sort((a, b) => b.wrong - a.wrong)

  return (
    <Screen
      header={{ title: advanced ? '심화 문제 결과' : '개념 확인 결과', dday }}
      bottom={
        <>
          <Button to="/teach/prepare">약점 설명하러 가기</Button>
          <Button to={studyLink} variant="secondary">
            개념 다시 보기
          </Button>
        </>
      }
      className="gap-6"
    >
      <PageTitle
        title={`${answers.length}문제 중 ${correct}문제 맞혔어요`}
        desc={
          weak.length ? '틀린 개념을 AI 학생에게 설명하며 빈틈을 채워요.' : '틀린 문제가 없어요!'
        }
      />

      <div className="grid grid-cols-3 gap-2">
        {byLevel.map(({ lv, total, rate }) => (
          <div key={lv} className="flex flex-col items-center gap-1 rounded-2xl bg-cool py-3">
            <span className="text-xs font-bold text-sub">난이도 {lv}</span>
            <span className="text-xl font-bold tracking-[-0.4px]">
              {rate === null ? '-' : `${rate}%`}
            </span>
            <span className="text-[11px] text-muted">{total}문제</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold tracking-[-0.16px]">설명할 약점</h2>
        {weak.length === 0 ? (
          <p className="rounded-2xl bg-primary-soft px-4 py-[14px] text-sm leading-[1.55] text-primary">
            틀린 문제가 없어요. 민지는 상 난이도 개념을 중심으로 질문할 거예요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weak.map((w, i) => (
              <li
                key={w.name}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${w.hard ? 'border-[1.5px] border-error/30 bg-error-soft/50' : 'border border-line'}`}
              >
                <span className="text-sm font-bold text-muted">{i + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[15px] font-bold">{w.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-sub">틀림 {w.wrong}문제</span>
                    {w.hard && <Chip tone="error">상 난이도 오답</Chip>}
                  </div>
                </div>
                <SourceChip page={w.page} />
              </li>
            ))}
          </ul>
        )}
        <p className="rounded-xl bg-secondary-soft px-4 py-3 text-[13px] leading-[1.55] font-medium text-secondary">
          민지가 이 약점을 중심으로 날카롭게 물어볼 거예요.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold tracking-[-0.16px]">문제별 결과</h2>
        <ul className="flex flex-col divide-y divide-line">
          {answers.map((a) => {
            const open = openId === a.ordinal
            const picked = a.choices?.findIndex((c) => c.id === a.pickedId)
            const right = a.choices?.findIndex((c) => c.id === a.answerId)
            return (
              <li key={a.ordinal}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : a.ordinal)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a.isCorrect ? 'bg-primary-soft text-primary' : 'bg-error-soft text-error'}`}
                  >
                    {a.isCorrect ? 'O' : 'X'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold">
                      {a.ordinal}. {a.sentence}
                    </span>
                    <span className="text-xs text-sub">
                      {a.concept} · 난이도 {a.level}
                      {picked >= 0 && ` · 내 답 ${marks[picked]} · 정답 ${marks[right]}`}
                      {picked < 0 && (a.myText ? ` · 내 답 ${a.myText}` : ' · 풀지 않음')}
                    </span>
                  </span>
                  <ChevronDownIcon
                    size={16}
                    className={`text-muted transition ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl bg-cool px-4 py-3">
                    <p className="text-[13px] leading-[1.6]">
                      정답은{' '}
                      {right >= 0 ? `${marks[right]} ${a.choices[right].text}` : a.answerText}.{' '}
                      {a.explanation}
                    </p>
                    {a.page && (
                      <div className="flex items-center justify-between">
                        <SourceChip page={a.page} label={`근거 p.${a.page}`} />
                      </div>
                    )}
                    {!USE_MOCK && a.questionId && <AttemptHistory questionId={a.questionId} />}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <BottomNote>약점은 문제 하나가 아니라 전체 결과에서 뽑았어요.</BottomNote>
    </Screen>
  )
}
