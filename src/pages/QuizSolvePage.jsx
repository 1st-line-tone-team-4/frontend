import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import iconCheck from '@/assets/icons/check-primary-18.svg'
import iconX from '@/assets/icons/x-error.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import { Input } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import SourceChip from '@/components/SourceChip'
import { QUIZ } from '@/data/flow'
import { useDday, useQuestionSet, useSubmitAttempt } from '@/hooks/useStudyApi'

// 더미 (목 모드) · 개념 확인 문제를 n개로 늘려요
const mockQuestion = (i, n) => {
  const q = QUIZ[i % QUIZ.length]
  return {
    title: q.concept,
    desc: `${q.concept} · 난이도 ${q.level}`,
    level: q.level,
    ordinal: i + 1,
    total: n,
    prompt: q.prompt,
    sentence: q.sentence,
    type: 'multiple_choice',
    choices: q.choices.map((text, k) => ({ id: `o${k}`, text })),
    answerId: `o${q.answer}`,
    explanation: q.explain,
    page: q.page,
    concept: q.concept,
  }
}

// 풀이 종류 라벨 (09 상단)
const KIND = { check: '개념 확인', supplement: '보충', advanced: '심화', retry: '오답 다시 풀기' }

const marks = ['①', '②', '③', '④', '⑤', '⑥']
const LEVEL = { easy: '하', medium: '중', hard: '상' }

// API 문제 → 화면 데이터
function toQuestion(item, total) {
  const q = item.question
  return {
    title: `${item.ordinal}번 문제`,
    desc: `${q.question_type === 'multiple_choice' ? '객관식' : '주관식'} · 난이도 ${LEVEL[q.difficulty]}`,
    ordinal: item.ordinal,
    total,
    prompt: '',
    sentence: q.prompt,
    type: q.question_type,
    choices: q.options,
  }
}

// 채점 결과(attempt) → { pickedId, correctId, isCorrect, explanation, shortAnswer }
function toResult(attempt) {
  if (!attempt?.result) return null
  const { result, answer } = attempt
  return {
    pickedId: answer.selected_option_ids?.[0],
    correctId: result.correct_answer.selected_option_ids?.[0],
    correctText: result.correct_answer.text,
    isCorrect: result.is_correct,
    explanation: [result.feedback, result.explanation].filter(Boolean).join('\n'),
  }
}

// 09 개념 확인 풀이
export default function QuizSolvePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kind = KIND[params.get('kind')] ? params.get('kind') : 'check'
  const mockTotal = Math.min(20, Math.max(5, Number(params.get('n')) || 10))
  const [mockIndex, setMockIndex] = useState(0)
  const [mockAnswers, setMockAnswers] = useState({}) // index → 고른 보기 id
  const dday = useDday()
  const setQuery = useQuestionSet()
  const submit = useSubmitAttempt()
  const [index, setIndex] = useState(null)
  const [results, setResults] = useState({}) // 이번에 제출한 채점 결과 (questionId → attempt)
  const [text, setText] = useState('')

  const set = setQuery.data
  const items = set ? [...set.items].sort((a, b) => a.ordinal - b.ordinal) : []
  // 처음 열면 아직 안 푼 문제부터
  const firstOpen = Math.max(
    items.findIndex((it) => !it.latest_attempt),
    0,
  )
  const current = index ?? firstOpen
  const item = items[current]

  const question = USE_MOCK
    ? mockQuestion(mockIndex, mockTotal)
    : item
      ? toQuestion(item, items.length)
      : null
  const mockPicked = mockAnswers[mockIndex]
  const result = USE_MOCK
    ? mockPicked && {
        pickedId: mockPicked,
        correctId: question.answerId,
        isCorrect: mockPicked === question.answerId,
        explanation: question.explanation,
      }
    : item && toResult(results[item.question.id] ?? item.latest_attempt)

  const header = { title: `${KIND[kind]} 풀이`, dday }
  if (!question) {
    return (
      <Screen header={header}>
        <ApiState
          query={setQuery}
          empty="만든 문제가 없어요."
          action={{ label: '문제 만들기', to: '/quiz' }}
        />
      </Screen>
    )
  }

  const answer = (payload) => {
    if (USE_MOCK)
      return setMockAnswers((a) => ({ ...a, [mockIndex]: payload.selected_option_ids[0] }))
    submit.mutate(
      { questionId: item.question.id, questionSetId: set.id, answer: payload },
      {
        onSuccess: (attempt) => setResults((r) => ({ ...r, [item.question.id]: attempt })),
        onError: (err) => alert(err.message),
      },
    )
  }

  const answered = !!result
  const choiceClass = (id) => {
    if (answered && id === result.correctId)
      return 'border-[1.5px] border-primary bg-primary-soft font-bold'
    if (answered && id === result.pickedId)
      return 'border-[1.5px] border-error bg-error-soft font-bold'
    return 'border border-line bg-white font-medium'
  }
  const pickedIndex = question.choices.findIndex((c) => c.id === result?.pickedId)
  const correctIndex = question.choices.findIndex((c) => c.id === result?.correctId)
  const hasNext = USE_MOCK ? mockIndex < mockTotal - 1 : current < items.length - 1

  // 마지막 문제 뒤에는 A-04 결과로 · 약점은 전체 결과에서 뽑아요
  const goNext = () => {
    setText('')
    if (hasNext) return USE_MOCK ? setMockIndex((i) => i + 1) : setIndex(current + 1)
    const answers = USE_MOCK
      ? Array.from({ length: mockTotal }, (_, i) => {
          const q = mockQuestion(i, mockTotal)
          return { ...q, pickedId: mockAnswers[i], isCorrect: mockAnswers[i] === q.answerId }
        })
      : null
    navigate(`/quiz/result?kind=${kind}`, { state: { answers } })
  }

  return (
    <Screen
      header={header}
      bottom={
        <Button variant={answered ? 'primary' : 'disabled'} onClick={goNext}>
          {hasNext ? '다음 문제' : '결과 보기'}
        </Button>
      }
    >
      <div className="flex items-center gap-[6px]">
        <Chip tone={kind === 'advanced' ? 'secondary' : 'solid'}>{KIND[kind]}</Chip>
        {question.level && (
          <Chip tone={question.level === '상' ? 'error' : 'cool'}>난이도 {question.level}</Chip>
        )}
      </div>
      <PageTitle title={question.title} desc={question.desc} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">
            {question.ordinal} / {question.total} 문제
          </p>
          <Chip tone="cool">내 자료 기반 · 비공개</Chip>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-cool">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(question.ordinal / question.total) * 100}%` }}
          />
        </div>
      </div>

      <Card tone="gradient" className="gap-2 rounded-[18px] p-[18px] leading-[1.4]">
        {question.prompt && <p className="text-[13px] font-medium text-sub">{question.prompt}</p>}
        <p className="text-[21px] font-bold tracking-[-0.21px] whitespace-pre-line">
          {question.sentence}
        </p>
      </Card>

      {question.type === 'multiple_choice' ? (
        <ul className="flex flex-col gap-2">
          {question.choices.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={answered || submit.isPending}
                onClick={() => answer({ type: 'multiple_choice', selected_option_ids: [c.id] })}
                className={`flex w-full items-center justify-between rounded-[14px] py-[14px] pr-[14px] pl-4 text-left text-[15px] leading-[1.3] ${choiceClass(c.id)}`}
              >
                <span className="whitespace-pre">{`${marks[i]}  ${c.text}`}</span>
                {answered && c.id === result.correctId && (
                  <img src={iconCheck} alt="정답" className="size-[18px]" />
                )}
                {answered && c.id === result.pickedId && !result.isCorrect && (
                  <img src={iconX} alt="오답" className="size-[18px]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) answer({ type: 'short_answer', text: text.trim() })
          }}
        >
          <div className="flex-1">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={answered}
              placeholder="답을 입력해 주세요"
            />
          </div>
          <Button type="submit" className="w-auto px-5" disabled={answered || submit.isPending}>
            제출
          </Button>
        </form>
      )}

      {submit.isPending && <p className="text-center text-xs text-muted">채점하고 있어요…</p>}

      {answered && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-cool px-4 py-[14px]">
          <div>
            <Chip tone={result.isCorrect ? 'primary' : 'error'}>
              {result.isCorrect
                ? '정답'
                : pickedIndex >= 0
                  ? `오답 · 선택한 답 ${marks[pickedIndex]}`
                  : '오답'}
            </Chip>
          </div>
          <p className="text-sm leading-[1.6] whitespace-pre-line">
            정답은{' '}
            {correctIndex >= 0 ? `${marks[correctIndex]}이에요` : `'${result.correctText}'예요`}.
            {'\n'}
            {result.explanation}
          </p>
          {question.page && <SourceChip page={question.page} label={`근거 p.${question.page}`} />}
        </div>
      )}

    </Screen>
  )
}
