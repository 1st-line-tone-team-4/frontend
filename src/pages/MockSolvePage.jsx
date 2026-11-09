import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { ChevronLeftIcon, ClockIcon, FlagIcon, GridIcon } from '@/components/icons'
import { BottomSheet, Modal } from '@/components/Overlay'
import { MOCK_EXAM, MOCK_QUESTIONS } from '@/data/flow'
import { MOCK_SAVE_KEY } from './MockIntroPage'

const marks = ['①', '②', '③', '④']
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function load() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_SAVE_KEY))
  } catch {
    return null
  }
}

// A-10 모의고사 풀이 · 제출 전에는 정답·해설을 보여 주지 않아요
export default function MockSolvePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saved = params.get('resume') ? load() : null
  const total = MOCK_QUESTIONS.length

  const [index, setIndex] = useState(saved?.index ?? 0)
  const [answers, setAnswers] = useState(saved?.answers ?? {})
  const [flags, setFlags] = useState(saved?.flags ?? [])
  const [left, setLeft] = useState(saved?.left ?? MOCK_EXAM.minutes * 60)
  const [gridOpen, setGridOpen] = useState(false)
  const [modal, setModal] = useState(null) // 'submit' | 'leave'
  const submitted = useRef(false)

  const q = MOCK_QUESTIONS[index]
  const unanswered = total - Object.keys(answers).length

  const submit = () => {
    if (submitted.current) return
    submitted.current = true
    localStorage.removeItem(MOCK_SAVE_KEY)
    const correct = MOCK_QUESTIONS.filter((x, i) => answers[i] === x.answer).length
    navigate('/mock/result', {
      replace: true,
      state: { correct, total, seconds: MOCK_EXAM.minutes * 60 - left, answers },
    })
  }

  // 타이머 · 시간 종료 시 자동 제출
  useEffect(() => {
    if (left <= 0) {
      submit()
      return
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [left])

  const saveAndLeave = () => {
    localStorage.setItem(MOCK_SAVE_KEY, JSON.stringify({ index, answers, flags, left }))
    navigate('/today')
  }

  const toggleFlag = () =>
    setFlags((f) => (f.includes(index) ? f.filter((x) => x !== index) : [...f, index]))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white">
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-white px-4 pt-2 pb-3">
        <div className="flex h-10 items-center justify-between">
          <button
            type="button"
            onClick={() => setModal('leave')}
            className="flex items-center gap-1"
          >
            <ChevronLeftIcon size={24} />
            <span className="text-base font-bold">모의고사</span>
          </button>
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
              left < 300 ? 'bg-error-soft text-error' : 'bg-primary-soft text-primary'
            }`}
            aria-label={`남은 시간 ${fmt(left)}`}
          >
            <ClockIcon size={15} /> {fmt(left)}
          </span>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-cool">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-sub tabular-nums">
            {index + 1} / {total}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-6 pt-2 pb-6">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-sub">{index + 1}번 문제</p>
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={flags.includes(index)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
              flags.includes(index) ? 'bg-secondary text-white' : 'bg-cool text-sub'
            }`}
          >
            <FlagIcon size={13} /> 나중에 보기
          </button>
        </div>
        <Card tone="gradient" className="gap-2 rounded-[18px] p-[18px]">
          <p className="text-[13px] font-medium text-sub">{q.prompt}</p>
          <p className="text-[20px] leading-[1.4] font-bold tracking-[-0.2px]">{q.sentence}</p>
        </Card>
        <ul className="flex flex-col gap-2">
          {q.choices.map((c, i) => {
            const on = answers[index] === i
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [index]: i }))}
                  className={`w-full rounded-[14px] py-[14px] pr-[14px] pl-4 text-left text-[15px] leading-[1.3] ${
                    on
                      ? 'border-[1.5px] border-primary bg-primary-soft font-bold text-primary'
                      : 'border border-line font-medium'
                  }`}
                >
                  {marks[i]} {c}
                </button>
              </li>
            )
          })}
        </ul>
      </main>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-white px-6 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="w-24"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            이전
          </Button>
          <button
            type="button"
            onClick={() => setGridOpen(true)}
            aria-label="문항 번호표"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-cool text-sub"
          >
            <GridIcon size={20} />
          </button>
          {index < total - 1 ? (
            <Button className="flex-1" onClick={() => setIndex((i) => i + 1)}>
              다음
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setModal('submit')}>
              제출
            </Button>
          )}
        </div>
      </div>

      <BottomSheet
        open={gridOpen}
        title="문항 번호표"
        onClose={() => setGridOpen(false)}
        footer={
          <Button
            onClick={() => {
              setGridOpen(false)
              setModal('submit')
            }}
          >
            제출하기
          </Button>
        }
      >
        <div className="flex gap-3 text-[11px] text-sub">
          <span className="flex items-center gap-1">
            <span className="size-3 rounded bg-primary" />푼 문항
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded border border-line" />안 푼 문항
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded bg-secondary" />
            표시한 문항
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {MOCK_QUESTIONS.map((x, i) => {
            const flagged = flags.includes(i)
            const done = answers[i] !== undefined
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setIndex(i)
                  setGridOpen(false)
                }}
                className={`h-11 rounded-xl text-sm font-bold ${
                  flagged
                    ? 'bg-secondary text-white'
                    : done
                      ? 'bg-primary text-white'
                      : 'border border-line text-sub'
                } ${i === index ? 'ring-2 ring-ink/40 ring-offset-1' : ''}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </BottomSheet>

      <Modal
        open={modal === 'submit'}
        title="제출할까요?"
        desc={
          unanswered > 0
            ? `안 푼 문항이 ${unanswered}개 있어요.\n제출하면 정답과 해설을 볼 수 있어요.`
            : '제출하면 정답과 해설을 볼 수 있어요.'
        }
        confirmLabel="제출하기"
        cancelLabel="계속 풀기"
        onConfirm={submit}
        onClose={() => setModal(null)}
      />
      <Modal
        open={modal === 'leave'}
        title="나중에 이어서 풀까요?"
        desc="지금까지 푼 내용과 남은 시간을 저장해요."
        confirmLabel="저장하고 나가기"
        cancelLabel="계속 풀기"
        onConfirm={saveAndLeave}
        onClose={() => setModal(null)}
      />
    </div>
  )
}
