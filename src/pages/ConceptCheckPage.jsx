import { useState } from 'react'
import iconPen from '@/assets/icons/pen.svg'
import iconTrash from '@/assets/icons/trash.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconPlus from '@/assets/icons/plus.svg'
import Button from '@/components/Button'
import Card, { Divider } from '@/components/Card'
import Checkbox from '@/components/Checkbox'
import Chip from '@/components/Chip'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import Source from '@/components/Source'

const FILE = '토익 문법 정리.pdf'

const initialConcepts = [
  { id: 'c1', text: '현재완료의 형태', page: 'p.24', checked: true },
  { id: 'c2', text: 'since와 for', page: 'p.24', checked: true },
  { id: 'c3', text: '현재완료의 계속 용법', page: 'p.25', checked: true },
  { id: 'c4', text: '과거 시점 부사와의 구분', page: 'p.25', checked: true },
]

const initialCriteria = [
  { id: 'k1', text: '현재완료의 형태를 설명한다', page: 'p.24', checked: true },
  { id: 'k2', text: 'since와 for를 구분한다', page: 'p.24', checked: true },
  { id: 'k3', text: '과거시제와의 차이를 설명한다', page: 'p.25', checked: true },
]

function ItemRow({ item, onToggle, onDelete }) {
  return (
    <li className="flex items-start gap-[10px] py-1">
      <Checkbox checked={item.checked} onChange={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className="text-sm leading-[1.4] font-medium">{item.text}</p>
        <Source>
          {FILE} {item.page}
        </Source>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="수정">
          <img src={iconPen} alt="" className="size-4" />
        </button>
        <button type="button" aria-label="삭제" onClick={onDelete}>
          <img src={iconTrash} alt="" className="size-4" />
        </button>
      </div>
    </li>
  )
}

function useItems(initial) {
  const [items, setItems] = useState(initial)
  return {
    items,
    toggle: (id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x))),
    remove: (id) => setItems((xs) => xs.filter((x) => x.id !== id)),
  }
}

// 04 개념 확인
export default function ConceptCheckPage() {
  const concepts = useItems(initialConcepts)
  const criteria = useItems(initialCriteria)

  return (
    <Screen
      header={{ title: '개념 확인' }}
      bottom={
        <>
          <BottomNote>
            모든 개념은 처음부터 학습해요.
            <br />
            확정한 항목을 기준으로 설명을 평가해요.
          </BottomNote>
          <Button to="/today">확정하고 코스 만들기</Button>
        </>
      }
    >
      <PageTitle title="공부할 개념을 확인해 주세요" desc="8개 개념 · 확인 항목 16개를 추출했어요." />

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">시제의 기초</p>
          <Chip>개념 4개</Chip>
        </div>
        <p className="text-sm leading-[1.55] text-sub">
          현재시제 · 과거시제
          <br />
          미래시제 · 주어와 동사의 수 일치
        </p>
        <Source>{FILE} p.20–23</Source>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">현재완료</p>
          <Chip>개념 {concepts.items.length}개</Chip>
        </div>
        <ul className="flex flex-col gap-[10px]">
          {concepts.items.map((it) => (
            <ItemRow key={it.id} item={it} onToggle={() => concepts.toggle(it.id)} onDelete={() => concepts.remove(it.id)} />
          ))}
        </ul>
        <Divider />
        <p className="text-xs leading-[1.4] font-medium text-sub">확인 항목: 형태 · 기간 표현 · 예문 설명</p>
      </Card>

      <Card tone="cool">
        <div className="flex flex-col gap-[2px] leading-[1.4]">
          <p className="text-base font-bold tracking-[-0.16px]">설명 평가에 쓸 확인 항목</p>
          <p className="text-xs text-sub">시제의 기초 4개 · 현재완료 12개</p>
        </div>
        <ul className="flex flex-col gap-[10px]">
          {criteria.items.map((it) => (
            <ItemRow key={it.id} item={it} onToggle={() => criteria.toggle(it.id)} onDelete={() => criteria.remove(it.id)} />
          ))}
        </ul>
        <button type="button" className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary">
          확인 항목 16개 모두 보기
          <img src={iconRight} alt="" className="size-[14px]" />
        </button>
      </Card>

      <button
        type="button"
        className="flex items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-primary py-[14px] text-sm leading-[1.3] font-bold text-primary"
      >
        <img src={iconPlus} alt="" className="size-4" />
        개념·확인 항목 추가
      </button>
    </Screen>
  )
}
