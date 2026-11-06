import iconAlert from '@/assets/icons/alert.svg'
import Button from '@/components/Button'
import Card, { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { BottomNote } from '@/components/Screen'
import Source from '@/components/Source'

const points = [
  {
    title: 'since · 시작한 시점',
    body: (
      <>
        since 뒤에는 시작 시점이 와요.
        <br />
        since 2021은 ‘2021년부터’라는 뜻이에요.
      </>
    ),
    source: 'p.24',
  },
  { title: 'for · 이어진 기간', body: 'for 뒤에는 기간이 와요. for five years는 ‘5년 동안’이라는 뜻이에요.', source: 'p.25' },
  {
    title: '과거 시점 부사는 주의해요',
    body: 'yesterday처럼 과거 시점이 분명한 말과는 현재완료 대신 과거시제를 써요.',
    source: 'p.25',
    warn: true,
  },
]

// 07 학습
export default function StudyPage() {
  return (
    <Screen
      header={{ title: '개념 학습', dday: 'D-5' }}
      bottom={
        <>
          <BottomNote>읽은 내용을 바탕으로 문제를 풀어볼 차례예요.</BottomNote>
          <Button to="/quiz">학습 완료 · 문제 만들기</Button>
        </>
      }
      className="gap-5"
    >
      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.4] font-medium text-sub">내 자료로 읽는 개념 · 2 / 2</p>
        <h1 className="text-[28px] leading-[1.25] font-bold tracking-[-0.84px]">현재완료</h1>
        <div className="pt-[2px]">
          <Chip tone="secondary">개념을 먼저 이해해요</Chip>
        </div>
      </div>

      <Card tone="gradient" className="rounded-[18px] px-5 py-[18px]">
        <p className="text-lg leading-[1.4] font-bold tracking-[-0.36px]">과거에서 지금까지 이어져요</p>
        <p className="text-sm leading-[1.65]">
          현재완료는 have/has + p.p. 형태예요. 과거의 일이 현재와 연결될 때 써요. 계속·경험·완료·결과를 나타낼 수 있어요.
        </p>
        <Source>토익 문법 정리.pdf p.24</Source>
      </Card>

      {points.map((p, i) => (
        <div key={p.title} className="flex flex-col gap-5">
          {i > 0 && <Divider />}
          <section className="flex flex-col gap-[6px]">
            <h2
              className={`flex items-center gap-[6px] text-base leading-[1.4] font-bold tracking-[-0.16px] ${p.warn ? 'text-secondary' : ''}`}
            >
              {p.warn && <img src={iconAlert} alt="" className="size-4" />}
              {p.title}
            </h2>
            <p className="text-sm leading-[1.65] text-sub">{p.body}</p>
            <Source>토익 문법 정리.pdf {p.source}</Source>
          </section>
        </div>
      ))}

      <Card tone="cool" className="gap-2 px-[18px]">
        <p className="text-[13px] leading-[1.4] font-bold text-primary">작은 예시로 확인해 볼까요?</p>
        <p className="text-[17px] leading-[1.4] font-bold tracking-[-0.17px]">She has worked here since 2021.</p>
        <p className="text-[13px] leading-[1.55] text-sub">2021년부터 지금까지 이곳에서 일해 왔다는 뜻이에요.</p>
        <Source>토익 문법 정리.pdf p.24 · 계속 용법 예시</Source>
      </Card>
    </Screen>
  )
}
