import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import iconCheck from '@/assets/icons/check-muted-12.svg'
import iconSend from '@/assets/icons/send.svg'
import iconMic from '@/assets/icons/mic-sm.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Logo from '@/components/Logo'
import Screen from '@/components/Screen'
import { students } from '@/data/students'
import {
  useCompleteTeachback,
  useDday,
  useSendTeachbackMessage,
  useTeachbackMessages,
  useTeachbackSession,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'

const MAX_QUESTIONS = 3
const ORDINAL = ['첫 번째', '두 번째', '세 번째']

// 더미 (목 모드에서 표시)
const DUMMY_MESSAGES = [
  {
    from: 'student',
    text: '안녕하세요! 현재완료를 언제 쓰는지 설명해 주실래요? 끝까지 듣고 질문할게요.',
  },
  {
    from: 'me',
    text: '현재완료는 have나 has 뒤에 과거분사를 써요. 과거의 일이 지금과 이어져요. yesterday 같은 과거 시점 부사와도 쓸 수 있어요.',
    note: '첫 설명 완료 · 전송됨',
  },
  {
    from: 'student',
    label: '첫 번째 질문',
    text: '설명 잘 들었어요! 그럼 since와 for는 어떻게 달라요? 예시로 알려주실래요?',
  },
]

// API 메시지 → 화면 말풍선 (내 설명 이후의 AI 메시지는 질문 번호를 붙여요)
function toBubbles(messages = []) {
  let userSeen = false
  let q = 0
  return [...messages]
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .map((m) => {
      if (m.role === 'user') {
        userSeen = true
        return { id: m.id, from: 'me', text: m.content, note: '전송됨' }
      }
      const label = userSeen ? `${ORDINAL[q++] ?? `${q}번째`} 질문` : undefined
      return { id: m.id, from: 'student', text: m.content, label }
    })
}

// 11 AI 학생에게 설명
export default function TeachChatPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const student = students.find((s) => s.id === params.get('student')) ?? students[0]
  const lang = params.get('lang') ?? '한국어'
  const dday = useDday()

  const sessionId = useStudyStore((s) => s.sessionId)
  const session = useTeachbackSession()
  const messagesQuery = useTeachbackMessages()
  const send = useSendTeachbackMessage()
  const complete = useCompleteTeachback()

  const [mockMessages, setMockMessages] = useState(DUMMY_MESSAGES)
  const [pendingText, setPendingText] = useState(null)
  const [draft, setDraft] = useState('')

  const messages = USE_MOCK ? mockMessages : toBubbles(messagesQuery.data)
  const questionCount = USE_MOCK
    ? messages.filter((m) => m.label).length
    : (session.data?.question_count ?? 0)
  const lastFromMe = messages[messages.length - 1]?.from === 'me'
  const status = USE_MOCK ? 'active' : session.data?.status
  // 질문 3개를 다 받은 뒤의 답변은 마지막 설명(final-answer)으로 제출, 그 후엔 '설명 마치기'만 가능
  const isFinal = questionCount >= MAX_QUESTIONS
  const canType = status === 'active' && !send.isPending && !(isFinal && lastFromMe)
  const conceptName = USE_MOCK ? '현재완료' : state?.conceptName

  const header = { title: 'AI 학생에게 설명', dday }
  if (!USE_MOCK && (!session.data || !messagesQuery.data)) {
    return (
      <Screen header={header}>
        <ApiState
          query={sessionId ? session : undefined}
          empty="진행 중인 설명이 없어요."
          action={{ label: '설명 준비하기', to: '/teach/prepare' }}
        />
      </Screen>
    )
  }

  const onSend = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !canType) return
    setDraft('')
    if (USE_MOCK) {
      setMockMessages((ms) => [...ms, { from: 'me', text, note: '전송됨' }])
      return
    }
    setPendingText(text)
    send.mutate(
      { sessionId, content: text, isFinal },
      {
        onError: (err) => {
          alert(err.message)
          setDraft(text)
        },
        onSettled: () => setPendingText(null),
      },
    )
  }

  const onFinish = () => {
    if (USE_MOCK || status === 'completed') return navigate('/report')
    complete.mutate(sessionId, {
      onSuccess: () => navigate('/report'),
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Screen
      header={header}
      bottom={
        <>
          {status === 'active' && (
            <form
              onSubmit={onSend}
              className="flex w-full items-center gap-2 rounded-3xl bg-cool pl-4"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canType}
                placeholder={
                  isFinal && lastFromMe
                    ? '설명을 마치고 리포트를 확인해 보세요'
                    : `${student.name}에게 답해 주세요`
                }
                className="h-9 min-w-0 flex-1 bg-transparent text-sm leading-[1.3] outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label="보내기"
                className="flex size-9 shrink-0 items-center justify-center rounded-[18px] bg-primary"
              >
                <img src={iconSend} alt="" className="size-[18px]" />
              </button>
            </form>
          )}
          <p className="flex w-full items-center gap-1 text-xs leading-[1.3] font-medium text-muted">
            <img src={iconMic} alt="" className="size-[13px]" />
            음성 · 곧 지원
          </p>
          <Button
            variant="secondary"
            onClick={onFinish}
            disabled={complete.isPending || send.isPending}
          >
            {complete.isPending
              ? '리포트를 만드는 중이에요…'
              : status === 'completed'
                ? '리포트 보기'
                : '설명 마치기'}
          </Button>
        </>
      }
      className="gap-[14px]"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-3xl bg-cool">
          <Logo variant="mascot" />
        </span>
        <div className="flex flex-1 flex-col leading-[1.4]">
          <p className="text-base font-bold tracking-[-0.16px]">학생 AI · {student.name}</p>
          <p className="text-xs text-sub">
            {student.type} · {lang}
          </p>
        </div>
        <Chip>
          질문 {questionCount} / {MAX_QUESTIONS}
        </Chip>
      </div>
      {conceptName && (
        <div>
          <Chip tone="cool">{conceptName}</Chip>
        </div>
      )}
      <Divider />

      <ul className="flex flex-col gap-[14px]">
        {messages.map((m, i) =>
          m.from === 'student' ? (
            <li key={m.id ?? i} className="flex flex-col items-start gap-[6px]">
              <p className="text-xs leading-[1.3] font-bold text-sub">
                {student.name}
                {m.label && ` · ${m.label}`}
              </p>
              <p className="max-w-[276px] rounded-tl-[4px] rounded-tr-2xl rounded-b-2xl bg-cool px-[14px] py-3 text-sm leading-[1.6]">
                {m.text}
              </p>
            </li>
          ) : (
            <li key={m.id ?? i} className="flex flex-col items-end gap-[6px]">
              <p className="max-w-[276px] rounded-tl-2xl rounded-tr-[4px] rounded-b-2xl bg-primary px-[14px] py-3 text-sm leading-[1.6] text-white">
                {m.text}
              </p>
              {m.note && (
                <p className="flex items-center gap-1 text-[11px] leading-[1.3] font-medium text-muted">
                  <img src={iconCheck} alt="" className="size-3" />
                  {m.note}
                </p>
              )}
            </li>
          ),
        )}
        {pendingText && (
          <>
            <li className="flex flex-col items-end gap-[6px]">
              <p className="max-w-[276px] rounded-tl-2xl rounded-tr-[4px] rounded-b-2xl bg-primary/70 px-[14px] py-3 text-sm leading-[1.6] text-white">
                {pendingText}
              </p>
            </li>
            {!isFinal && (
              <li className="text-xs leading-[1.3] font-bold text-sub">
                {student.name}가 생각하고 있어요…
              </li>
            )}
          </>
        )}
      </ul>
    </Screen>
  )
}
