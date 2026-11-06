import { Link } from 'react-router-dom'
import iconFile from '@/assets/icons/file-lg.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheck14 from '@/assets/icons/check-primary-14b.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconLock from '@/assets/icons/lock-sm.svg'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'
import Source from '@/components/Source'

const concepts = [
  {
    title: '시제의 기초 · 개념 4개',
    chip: '체크리스트 4개 · 확정',
    lines: ['현재시제 · 과거시제', '미래시제 · 주어와 동사의 수 일치'],
    pages: 'p.20–23',
  },
  {
    title: '현재완료 · 개념 4개',
    chip: '체크리스트 12개 · 확정',
    lines: ['현재완료의 형태 · since와 for', '계속 용법 · 과거 시점 부사'],
    pages: 'p.24–25',
    checklist: ['현재완료의 형태를 설명할 수 있다', 'since와 for를 구분할 수 있다', '과거시제와의 차이를 설명한다'],
    more: '확인 항목 12개 모두 보기',
  },
]

const actions = [
  { label: '원본 보기', to: '/materials' },
  { label: '개념 다시 확인', to: '/concepts' },
  { label: '더 보기', to: '/materials' },
]

// 13 내 자료
export default function MaterialsPage() {
  return (
    <Screen header="app" tabs className="gap-[18px]">
      <div className="flex flex-col gap-[6px]">
        <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px]">내 공부의 근거, 내 자료</h1>
        <div className="flex items-center gap-2">
          <Chip>D-5</Chip>
          <p className="text-sm leading-[1.4] text-sub">토익 정기시험 · 자료 1개</p>
        </div>
      </div>

      <Card tone="gradient" className="gap-3 rounded-[18px] px-[18px] pt-[18px] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white">
            <img src={iconFile} alt="" className="size-[21.12px]" />
          </span>
          <div className="flex flex-col gap-[2px] leading-[1.4]">
            <p className="text-base font-bold tracking-[-0.16px]">토익 문법 정리.pdf</p>
            <p className="text-xs text-sub">32페이지 · 2.4 MB · 11월 3일 업로드</p>
          </div>
        </div>
        <div className="flex gap-[6px]">
          <Chip tone="white" className="text-primary">
            <img src={iconCheck} alt="" className="size-[11px]" />
            업로드 완료
          </Chip>
          <Chip tone="white" className="text-primary">
            개념 8개 확정
          </Chip>
        </div>
        <div className="flex items-center pt-1">
          {actions.map((a, i) => (
            <div key={a.label} className="flex flex-1 items-center">
              {i > 0 && <span className="h-3 w-px bg-line" />}
              <Link to={a.to} className="flex-1 py-1 text-center text-[13px] leading-[1.3] font-bold text-primary">
                {a.label}
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">이 자료에서 공부하는 개념</h2>
      {concepts.map((c) => (
        <Card key={c.title} className="gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">{c.title}</p>
            <Chip>{c.chip}</Chip>
          </div>
          <p className="text-[13px] leading-[1.55] text-sub">
            {c.lines[0]}
            <br />
            {c.lines[1]}
          </p>
          <Source>토익 문법 정리.pdf {c.pages}</Source>
          {c.checklist && (
            <ul className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-3">
              {c.checklist.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] leading-[1.4] font-medium">
                  <img src={iconCheck14} alt="" className="size-[14px]" />
                  {t}
                </li>
              ))}
            </ul>
          )}
          {c.more && (
            <Link to="/concepts" className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary">
              {c.more}
              <img src={iconRight} alt="" className="size-[14px]" />
            </Link>
          )}
        </Card>
      ))}

      <p className="flex items-center gap-[6px] text-xs leading-[1.3] text-muted">
        <img src={iconLock} alt="" className="size-[13px]" />
        자료와 근거 페이지는 나만 볼 수 있어요.
      </p>
      <Button to="/upload">자료 추가하기</Button>
    </Screen>
  )
}
