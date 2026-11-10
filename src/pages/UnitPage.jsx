import { USE_MOCK } from '@/api/client'
import { LiveUnitView } from '@/components/LiveLearningViews'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { ChevronDownIcon, ChevronRightIcon, ClockIcon } from '@/components/icons'
import Screen from '@/components/Screen'
import SourceChip from '@/components/SourceChip'
import { CONCEPTS, STATUS_LABEL, UNIT } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

const STATUS_COLOR = {
  todo: 'bg-line',
  read: 'bg-primary/40',
  checked: 'bg-secondary',
  taught: 'bg-primary',
}

// A-01 단원 개념 정리 (새 화면)
function MockUnitPage() {
  const dday = useDday()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const firstTodo = CONCEPTS.find((c) => c.status === 'todo') ?? CONCEPTS[0]
  const todayAllRead = CONCEPTS.filter((c) => c.today).every((c) => c.status !== 'todo')
  const exampleCount = CONCEPTS.reduce((a, c) => a + c.examples, 0)

  return (
    <Screen
      header={{ title: '단원 개념 정리', dday }}
      bottom={
        <>
          <Button to={`/learn?c=${firstTodo.id}`}>이어서 배우기 · {firstTodo.name}</Button>
          <Button to="/quiz" variant={todayAllRead ? 'secondary' : 'disabled'}>
            이 단원 개념 확인하기
          </Button>
        </>
      }
      className="gap-5"
    >
      {/* 단원 헤더 */}
      <div className="flex flex-col gap-2 rounded-[18px] bg-[linear-gradient(144deg,var(--color-logo-blue)_0%,var(--color-primary)_74%)] px-5 py-[18px] text-white">
        <p className="text-xs font-bold text-white/85">{UNIT.label}</p>
        <h1 className="text-[22px] leading-[1.3] font-bold tracking-[-0.44px]">{UNIT.title}</h1>
        <p className="text-[13px] text-white/85">
          {UNIT.file} · {UNIT.pages}
        </p>
        <div className="flex gap-4 pt-1 text-xs font-medium text-white/90">
          <span>개념 {CONCEPTS.length}개</span>
          <span>예제 {exampleCount}개</span>
          <span className="flex items-center gap-1">
            <ClockIcon size={13} /> 약 {UNIT.minutes}분
          </span>
        </div>
      </div>

      {/* 단원 진행 */}
      <section className="flex flex-col gap-2">
        <div className="flex gap-1">
          {CONCEPTS.map((c) => (
            <span key={c.id} className={`h-[6px] flex-1 rounded-full ${STATUS_COLOR[c.status]}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-sub">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`size-2 rounded-full ${STATUS_COLOR[k]}`} />
              {v.text}
            </span>
          ))}
        </div>
      </section>

      {/* 개념 카드 */}
      <ul className="flex flex-col gap-[10px]">
        {CONCEPTS.map((c, i) => {
          const st = STATUS_LABEL[c.status]
          return (
            <li key={c.id}>
              <div
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/learn?c=${c.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/learn?c=${c.id}`)}
                className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-white p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">{i + 1}</span>
                  <p className="flex-1 text-[15px] font-bold tracking-[-0.15px]">{c.name}</p>
                  {c.today && <Chip tone="solid">오늘</Chip>}
                  <Chip tone={st.tone}>{st.text}</Chip>
                  <ChevronRightIcon size={16} className="text-muted" />
                </div>
                <p className="text-[13px] leading-[1.5] text-sub">{c.summary}</p>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <SourceChip page={c.page} />
                  <span className="text-[11px] font-medium text-muted">예제 {c.examples}개</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 단원 요약 */}
      <section className="rounded-2xl bg-cool">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-[14px] text-sm font-bold"
        >
          단원 요약 · 핵심 3줄
          <ChevronDownIcon size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            <ol className="flex list-decimal flex-col gap-1 pl-4 text-[13px] leading-[1.6]">
              {UNIT.summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-error">자주 틀리는 점</p>
              {UNIT.pitfalls.map((p) => (
                <p key={p} className="text-[13px] leading-[1.55] text-sub">
                  · {p}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>
    </Screen>
  )
}

export default function UnitPage() {
  return USE_MOCK ? <MockUnitPage /> : <LiveUnitView />
}
