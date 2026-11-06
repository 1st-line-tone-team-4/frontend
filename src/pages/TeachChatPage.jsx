import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import iconCheck from '@/assets/icons/check-muted-12.svg'
import iconSend from '@/assets/icons/send.svg'
import iconMic from '@/assets/icons/mic-sm.svg'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Logo from '@/components/Logo'
import Screen from '@/components/Screen'
import { students } from '@/data/students'

const MAX_QUESTIONS = 3

// 11 AI 학생에게 설명
export default function TeachChatPage() {
  const [params] = useSearchParams()
  const student = students.find((s) => s.id === params.get('student')) ?? students[0]
  const lang = params.get('lang') ?? '한국어'

  const [messages, setMessages] = useState([
    { from: 'student', text: '안녕하세요! 현재완료를 언제 쓰는지 설명해 주실래요? 끝까지 듣고 질문할게요.' },
    {
      from: 'me',
      text: '현재완료는 have나 has 뒤에 과거분사를 써요. 과거의 일이 지금과 이어져요. yesterday 같은 과거 시점 부사와도 쓸 수 있어요.',
      note: '첫 설명 완료 · 전송됨',
    },
    { from: 'student', label: '첫 번째 질문', text: '설명 잘 들었어요! 그럼 since와 for는 어떻게 달라요? 예시로 알려주실래요?' },
  ])
  const [draft, setDraft] = useState('')
  const questionCount = messages.filter((m) => m.label).length

  const send = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((ms) => [...ms, { from: 'me', text, note: '전송됨' }])
    setDraft('')
  }

  return (
    <Screen
      header={{ title: 'AI 학생에게 설명', dday: 'D-5' }}
      bottom={
        <>
          <form onSubmit={send} className="flex w-full items-center gap-2 rounded-3xl bg-cool pl-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`${student.name}에게 답해 주세요`}
              className="h-9 min-w-0 flex-1 bg-transparent text-sm leading-[1.3] outline-none placeholder:text-muted"
            />
            <button type="submit" aria-label="보내기" className="flex size-9 shrink-0 items-center justify-center rounded-[18px] bg-primary">
              <img src={iconSend} alt="" className="size-[18px]" />
            </button>
          </form>
          <p className="flex w-full items-center gap-1 text-xs leading-[1.3] font-medium text-muted">
            <img src={iconMic} alt="" className="size-[13px]" />
            음성 · 곧 지원
          </p>
          <Button to="/report" variant="secondary">
            설명 마치기
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
      <div>
        <Chip tone="cool">현재완료</Chip>
      </div>
      <Divider />

      <ul className="flex flex-col gap-[14px]">
        {messages.map((m, i) =>
          m.from === 'student' ? (
            <li key={i} className="flex flex-col items-start gap-[6px]">
              <p className="text-xs leading-[1.3] font-bold text-sub">
                {student.name}
                {m.label && ` · ${m.label}`}
              </p>
              <p className="max-w-[276px] rounded-tl-[4px] rounded-tr-2xl rounded-b-2xl bg-cool px-[14px] py-3 text-sm leading-[1.6]">
                {m.text}
              </p>
            </li>
          ) : (
            <li key={i} className="flex flex-col items-end gap-[6px]">
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
      </ul>
    </Screen>
  )
}
