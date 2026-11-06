import { useState } from 'react'
import iconCheck from '@/assets/icons/check-white.svg'
import iconRadio from '@/assets/icons/radio-off.svg'
import iconMessage from '@/assets/icons/message.svg'
import iconMic from '@/assets/icons/mic.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { Field, Segment, Select } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import { students } from '@/data/students'

// 10 설명 준비
export default function TeachPreparePage() {
  const [lang, setLang] = useState('한국어')
  const [studentId, setStudentId] = useState('minji')
  const student = students.find((s) => s.id === studentId)

  return (
    <Screen
      header={{ title: '설명 준비', dday: 'D-5' }}
      bottom={
        <Button to={`/teach?student=${studentId}&lang=${lang}`}>{student.name}에게 설명 시작하기</Button>
      }
      className="gap-[18px]"
    >
      <PageTitle title="이번엔 내가 선생님이에요" desc="틀린 개념을 AI 학생에게 설명해 주세요." />

      <Field label="설명할 약점 개념" strong>
        <Select options={['현재완료', '과거 시점 부사', 'since와 for']} />
      </Field>

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">설명 언어</p>
        <Segment options={['한국어', '영어']} value={lang} onChange={setLang} />
      </div>

      <div className="flex flex-col gap-[10px]">
        <p className="text-[13px] leading-[1.3] font-bold">어떤 학생과 이야기할까요?</p>
        {students.map((s) => {
          const on = s.id === studentId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStudentId(s.id)}
              className={`flex items-center gap-3 rounded-[14px] px-[14px] py-3 text-left ${
                on ? 'border-[1.5px] border-primary bg-primary-soft' : 'border border-line bg-white'
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-[20px] text-[15px] leading-[1.2] font-bold ${
                  on ? 'bg-white text-primary' : 'bg-cool text-sub'
                }`}
              >
                {s.initial}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[1.4]">
                <span className="text-[15px] font-bold tracking-[-0.15px]">{s.type}</span>
                <span className="text-xs text-sub">
                  {s.name} · {s.desc}
                </span>
              </span>
              {on ? (
                <Chip tone="solid">
                  <img src={iconCheck} alt="" className="size-[11px]" />
                  선택
                </Chip>
              ) : (
                <img src={iconRadio} alt="" className="size-5" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-[14px]">
        <div className="flex gap-[10px]">
          <img src={iconMessage} alt="" className="size-[18px] shrink-0" />
          <div className="flex flex-col gap-[2px]">
            <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">먼저 끝까지 듣고, 최대 3번 질문해요</p>
            <p className="text-[13px] leading-[1.5] text-sub">
              학생은 정답을 먼저 알려주거나
              <br />
              내 설명을 대신 완성하지 않아요.
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1 pt-1 text-xs leading-[1.3] font-medium text-muted">
          <img src={iconMic} alt="" className="size-[14px]" />
          음성 설명은 곧 지원
        </p>
      </div>
    </Screen>
  )
}
