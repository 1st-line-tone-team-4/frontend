import { useState } from 'react'
import iconLock from '@/assets/icons/lock.svg'
import iconShare from '@/assets/icons/share.svg'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Segment, Select } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import Toggle from '@/components/Toggle'

// 08 문제 만들기
export default function QuizCreatePage() {
  const [scope, setScope] = useState('개념 선택')
  const [level, setLevel] = useState('중')

  return (
    <Screen
      header={{ title: '문제 만들기', dday: 'D-5' }}
      bottom={<Button to="/quiz/solve">문제 만들기</Button>}
      className="gap-[18px]"
    >
      <PageTitle title="읽은 개념을 문제로 확인해요" desc="내 자료와 확정한 개념을 바탕으로 만들어요." />

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">출제 범위</p>
        <Segment options={['개념 선택', '자료 전체']} value={scope} onChange={setScope} />
      </div>

      {scope === '개념 선택' && (
        <div className="flex flex-col gap-[6px]">
          <Field label="선택한 개념" strong>
            <Select options={['현재완료', '시제의 기초']} />
          </Field>
          <Source>토익 문법 정리.pdf · p.24–25</Source>
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.3] font-bold">난이도</p>
        <Segment options={['하', '중', '상']} value={level} onChange={setLevel} />
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <Field label="문제 수" strong>
          <Select options={['10문제', '5문제', '15문제', '20문제']} />
        </Field>
        <Field label="시험 키워드" strong>
          <Select options={['토익', '토플', '텝스']} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-[14px] bg-cool px-4 py-[14px]">
        <div className="flex gap-[10px]">
          <img src={iconLock} alt="" className="size-[18px] shrink-0" />
          <div className="flex flex-col gap-[2px]">
            <p className="flex items-center gap-[6px] text-sm leading-[1.4] font-bold tracking-[-0.14px]">
              비공개로 만들어요 <Chip>기본</Chip>
            </p>
            <p className="text-[13px] leading-[1.5] text-sub">내 문제와 풀이 기록은 나만 볼 수 있어요.</p>
          </div>
        </div>
        <Divider />
        <div className="flex gap-[10px] text-muted">
          <img src={iconShare} alt="" className="size-[18px] shrink-0" />
          <div className="flex flex-1 flex-col gap-[2px]">
            <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">공개 공유 · 출시 예정</p>
            <p className="text-xs leading-[1.5]">
              공유는 직접 선택할 때만 이뤄져요.
              <br />
              원본 자료와 비공개 페이지는 공개되지 않아요.
            </p>
          </div>
          <Toggle disabled />
        </div>
      </div>
    </Screen>
  )
}
