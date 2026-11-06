import { useState } from 'react'
import iconCheck from '@/assets/icons/check-primary-18.svg'
import iconX from '@/assets/icons/x-error.svg'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { PageTitle } from '@/components/Screen'

const question = {
  prompt: '빈칸에 들어갈 가장 알맞은 표현은?',
  sentence: 'She ___ here since 2021.',
  choices: ['has worked', 'worked', 'works', 'will work'],
  answer: 0,
}
const marks = ['①', '②', '③', '④']

// 09 문제 풀이
export default function QuizSolvePage() {
  // 보기를 고르면 정답/오답과 해설이 보여요 (시안은 ②를 고른 상태)
  const [picked, setPicked] = useState(null)
  const answered = picked !== null
  const correct = picked === question.answer

  const choiceClass = (i) => {
    if (answered && i === question.answer) return 'border-[1.5px] border-primary bg-primary-soft font-bold'
    if (answered && i === picked) return 'border-[1.5px] border-error bg-error-soft font-bold'
    return 'border border-line bg-white font-medium'
  }

  return (
    <Screen header={{ title: '문제 풀이', dday: 'D-5' }} bottom={<Button to="/teach/prepare">이 문제 설명하기</Button>}>
      <PageTitle title="현재완료에 알맞은 동사 형태" desc="현재완료 · 난이도 중" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">3 / 10 문제</p>
          <Chip tone="cool">내 자료 기반 · 비공개</Chip>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-cool">
          <div className="h-full w-[30%] rounded-full bg-primary" />
        </div>
      </div>

      <Card tone="gradient" className="gap-2 rounded-[18px] p-[18px] leading-[1.4]">
        <p className="text-[13px] font-medium text-sub">{question.prompt}</p>
        <p className="text-[21px] font-bold tracking-[-0.21px]">{question.sentence}</p>
      </Card>

      <ul className="flex flex-col gap-2">
        {question.choices.map((c, i) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => !answered && setPicked(i)}
              className={`flex w-full items-center justify-between rounded-[14px] py-[14px] pr-[14px] pl-4 text-left text-[15px] leading-[1.3] ${choiceClass(i)}`}
            >
              <span className="whitespace-pre">{`${marks[i]}  ${c}`}</span>
              {answered && i === question.answer && <img src={iconCheck} alt="정답" className="size-[18px]" />}
              {answered && i === picked && !correct && <img src={iconX} alt="오답" className="size-[18px]" />}
            </button>
          </li>
        ))}
      </ul>

      {answered && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-cool px-4 py-[14px]">
          <div>
            <Chip tone={correct ? 'primary' : 'error'}>
              {correct ? '정답' : `오답 · 선택한 답 ${marks[picked]}`}
            </Chip>
          </div>
          <p className="text-sm leading-[1.6]">
            정답은 {marks[question.answer]}이에요.
            <br />
            2021년부터 지금까지 이어지는 일이에요. 왜 현재완료를 쓰는지 설명해 볼까요?
          </p>
        </div>
      )}

      <p className="flex items-center justify-center gap-[6px] text-xs leading-[1.3]">
        <span className="text-muted">문제에 오류가 있나요?</span>
        <button type="button" className="font-bold text-sub underline">
          문제 신고
        </button>
      </p>
    </Screen>
  )
}
