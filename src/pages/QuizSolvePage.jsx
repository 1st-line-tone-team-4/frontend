import { useRef, useState } from 'react'
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
import { TypingDots } from '@/components/voice/MicWave'
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
const KIND = {
  check: '개념 확인 퀴즈',
  supplement: '보충',
  advanced: '심화',
  retry: '오답 다시 풀기',
}

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
// 보기를 누르면 고르기만 해요 (다음 문제를 누르기 전까지 바꿀 수 있어요)
// 다음 문제를 누르면 그때 제출하고 바로 넘어가요 · 채점은 뒤에서 이어지고, 결과 보기에서 모두 기다려요
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
  const [pickedId, setPickedId] = useState(null) // 지금 문제에서 고른 보기 (아직 제출 전)
  const [text, setText] = useState('')
  const [finishing, setFinishing] = useState(false) // 결과 보기 전 남은 채점을 기다리는 중
  const grading = useRef(new Map()) // 이번에 제출한 문제 → 채점 promise (questionId → { index, promise })

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
  // 예전에 이미 풀어 둔 문제는 그 결과를 보여주고 다시 고를 수 없어요
  const result =
    !USE_MOCK && item && !grading.current.has(item.question.id)
      ? toResult(item.latest_attempt)
      : null

  // 뒤로가기 = 이전 화면 (문제 만들기 · 오늘) · 주소로 바로 열었으면 이전 기록이 없어서 오늘 화면으로
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/today'))
  const header = { title: `${KIND[kind]} 풀이`, dday, onBack: goBack }
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

  const answered = !!result // 예전 풀이 결과가 있는 문제
  const draft =
    question.type === 'multiple_choice'
      ? pickedId && { type: 'multiple_choice', selected_option_ids: [pickedId] }
      : text.trim() && { type: 'short_answer', text: text.trim() }
  const canGoNext = !finishing && (answered || !!draft)

  const choiceClass = (id) => {
    if (answered && id === result.correctId)
      return 'border-[1.5px] border-primary bg-primary-soft font-bold'
    if (answered && id === result.pickedId)
      return 'border-[1.5px] border-error bg-error-soft font-bold'
    if (!answered && id === pickedId)
      return 'border-[1.5px] border-primary bg-primary-soft font-bold'
    return 'border border-line bg-white font-medium'
  }
  const pickedIndex = question.choices.findIndex((c) => c.id === result?.pickedId)
  const correctIndex = question.choices.findIndex((c) => c.id === result?.correctId)
  // 다음으로 풀 문제 · 실패해서 다시 푼 뒤에는 이미 제출한 문제를 건너뛰어요
  const nextIndex = USE_MOCK
    ? null
    : items.findIndex((it, i) => i > current && !grading.current.has(it.question.id))
  const hasNext = USE_MOCK ? mockIndex < mockTotal - 1 : nextIndex >= 0

  // 고른 답을 제출해요 · 기다리지 않고 채점 promise 만 모아 둬요
  const submitDraft = () => {
    const qid = item.question.id
    const promise = submit.mutateAsync({ questionId: qid, questionSetId: set.id, answer: draft })
    promise.catch(() => {}) // 실패는 결과 보기에서 한 번에 알려요
    grading.current.set(qid, { index: current, promise })
  }

  // 남은 채점을 모두 기다린 뒤 결과로 · 실패한 문제가 있으면 그 문제로 돌아가 다시 풀어요
  const finish = async () => {
    setFinishing(true)
    const entries = [...grading.current.entries()]
    const outcomes = await Promise.allSettled(entries.map(([, g]) => g.promise))
    const failed = entries.filter((_, i) => outcomes[i].status === 'rejected')
    if (failed.length) {
      failed.forEach(([qid]) => grading.current.delete(qid))
      const first = failed.map(([, g]) => g.index).sort((a, b) => a - b)[0]
      setFinishing(false)
      setIndex(first)
      alert(`${first + 1}번 문제 채점에 실패했어요. 답을 다시 골라 주세요.`)
      return
    }
    await setQuery.refetch()
    navigate(`/quiz/result?kind=${kind}`)
  }

  // 마지막 문제 뒤에는 A-04 결과로 · 약점은 전체 결과에서 뽑아요
  const goNext = () => {
    if (!canGoNext) return
    setPickedId(null)
    setText('')
    if (USE_MOCK) {
      const all = draft
        ? { ...mockAnswers, [mockIndex]: draft.selected_option_ids[0] }
        : mockAnswers
      setMockAnswers(all)
      if (hasNext) return setMockIndex((i) => i + 1)
      const answers = Array.from({ length: mockTotal }, (_, i) => {
        const q = mockQuestion(i, mockTotal)
        return { ...q, pickedId: all[i], isCorrect: all[i] === q.answerId }
      })
      return navigate(`/quiz/result?kind=${kind}`, { state: { answers } })
    }
    if (!answered) submitDraft()
    if (hasNext) return setIndex(nextIndex)
    finish()
  }

  return (
    <Screen
      header={header}
      bottom={
        <Button variant={canGoNext ? 'primary' : 'disabled'} onClick={goNext}>
          {finishing ? (
            <>
              <TypingDots className="h-[21px]" />
              <span className="sr-only">채점 결과를 모으고 있어요</span>
            </>
          ) : hasNext ? (
            '다음 문제'
          ) : (
            '결과 보기'
          )}
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
            className="h-full rounded-full bg-progress"
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
                disabled={answered || finishing}
                aria-pressed={!answered && c.id === pickedId}
                onClick={() => setPickedId(c.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-[14px] py-[14px] pr-[14px] pl-4 text-left text-[15px] leading-[1.45] ${choiceClass(c.id)}`}
              >
                {/* 긴 보기는 줄바꿈 · 둘째 줄부터는 번호 뒤에 맞춰 들여써요 */}
                <span className="flex min-w-0 flex-1 gap-2">
                  <span className="shrink-0">{marks[i]}</span>
                  <span className="min-w-0 break-keep [overflow-wrap:anywhere]">{c.text}</span>
                </span>
                {answered && c.id === result.correctId && (
                  <img src={iconCheck} alt="정답" className="size-[18px] shrink-0" />
                )}
                {answered && c.id === result.pickedId && !result.isCorrect && (
                  <img src={iconX} alt="오답" className="size-[18px] shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        // 엔터 = 다음 문제 (답은 다음 문제를 누를 때 제출돼요)
        <form
          onSubmit={(e) => {
            e.preventDefault()
            goNext()
          }}
        >
          <Input
            value={answered ? (item.latest_attempt?.answer.text ?? '') : text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered || finishing}
            placeholder="답을 입력해 주세요"
          />
        </form>
      )}

      {finishing && <p className="text-center text-xs text-muted">남은 채점을 기다리고 있어요…</p>}

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
