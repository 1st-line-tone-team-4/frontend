import { USE_MOCK } from '@/api/client'
import { LiveLearnView } from '@/components/LiveLearningViews'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { ChevronLeftIcon, ExpandIcon } from '@/components/icons'
import SourceChip from '@/components/SourceChip'
import SourceViewer from '@/components/SourceViewer'
import { CONCEPTS, FILE, UNIT } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

const SNAP = [22, 40, 62] // 자료 뷰어 높이(%) · 시트를 끌면 이 위치로 붙어요

// A-02 개념 설명 · 자료 나란히 보기 (07 대체)
function MockLearnPage() {
  const navigate = useNavigate()
  const dday = useDday()
  const [params] = useSearchParams()
  const index = Math.max(
    0,
    CONCEPTS.findIndex((c) => c.id === params.get('c')),
  )
  const concept = CONCEPTS[index]
  const prev = CONCEPTS[index - 1]
  const next = CONCEPTS[index + 1]

  const [viewer, setViewer] = useState({ page: concept.page, highlight: concept.highlight })
  const [pct, setPct] = useState(40)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef(null)
  const sheetRef = useRef(null)

  // 개념이 바뀌면 뷰어도 그 근거로
  useEffect(() => {
    setViewer({ page: concept.page, highlight: concept.highlight })
    sheetRef.current?.scrollTo({ top: 0 })
  }, [concept])

  const onDrag = (e) => {
    if (!dragging || !wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    const p = ((e.clientY - r.top) / r.height) * 100
    setPct(Math.min(70, Math.max(16, p)))
  }
  const endDrag = () => {
    if (!dragging) return
    setDragging(false)
    setPct((p) => SNAP.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a)))
  }

  const jump = (page, highlight) => {
    setViewer({ page, highlight })
    if (pct < 30) setPct(40)
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-cool md:max-w-[1024px]">
      {/* 상단 바 */}
      <header className="flex h-12 items-center justify-between bg-white px-3">
        <button type="button" onClick={() => navigate('/unit')} className="flex items-center gap-1">
          <ChevronLeftIcon size={24} />
          <span className="text-base font-bold">개념 설명</span>
        </button>
        <div className="flex items-center gap-2">
          <Chip tone="cool">
            {index + 1} / {CONCEPTS.length}
          </Chip>
          {dday && <Chip>{dday}</Chip>}
        </div>
      </header>

      <div
        ref={wrapRef}
        className="relative flex min-h-0 flex-1 flex-col md:flex-row"
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* 자료 뷰어 */}
        <section
          className={`relative overflow-y-auto px-4 pt-3 pb-8 md:!h-auto md:flex-1 md:pb-4 ${dragging ? '' : 'transition-[height] duration-300'}`}
          style={{ height: `${pct}%` }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-sub">
              {FILE} · p.{viewer.page}
            </span>
            <Link
              to={`/source?page=${viewer.page}`}
              className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-sub shadow-sm"
            >
              <ExpandIcon size={12} /> 전체 화면
            </Link>
          </div>
          <SourceViewer page={viewer.page} highlight={viewer.highlight} />
        </section>

        {/* 설명 시트 */}
        <section className="relative -mt-4 flex min-h-0 flex-1 flex-col rounded-t-[24px] bg-white shadow-[0_-8px_24px_-12px_rgba(30,40,66,0.2)] md:mt-0 md:max-w-[480px] md:rounded-none md:border-l md:border-line md:shadow-none">
          <div
            role="separator"
            aria-label="자료와 설명 크기 조절"
            aria-orientation="horizontal"
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId)
              setDragging(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') setPct((p) => SNAP[Math.max(0, SNAP.indexOf(p) - 1)] ?? 22)
              if (e.key === 'ArrowDown') setPct((p) => SNAP[Math.min(2, SNAP.indexOf(p) + 1)] ?? 62)
            }}
            className="flex shrink-0 cursor-row-resize touch-none justify-center py-3 md:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>

          <div
            ref={sheetRef}
            className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6 md:pt-6"
          >
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-primary">
                {UNIT.label} · {UNIT.title}
              </p>
              <h1 className="text-[22px] leading-[1.35] font-bold tracking-[-0.44px]">
                {concept.name}
              </h1>
            </div>

            <Block n="①" title="핵심 개념">
              <p className="text-[15px] font-bold">{concept.core.title}</p>
              <p className="text-sm leading-[1.65] text-ink">{concept.core.body}</p>
              <p className="rounded-lg bg-primary-soft px-3 py-2 text-[13px] font-bold text-primary">
                {concept.core.rule}
              </p>
              <SourceChip
                page={concept.page}
                onClick={() => jump(concept.page, concept.highlight)}
              />
            </Block>

            <Block n="②" title="예제">
              <div className="rounded-xl bg-cool px-4 py-3">
                <p className="text-[15px] font-bold">{concept.example.en}</p>
                <p className="text-[13px] text-sub">{concept.example.ko}</p>
              </div>
              <ol className="flex flex-col gap-[6px]">
                {concept.steps.map((s, i) => (
                  <li key={s} className="flex gap-2 text-[13px] leading-[1.55]">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <SourceChip
                page={concept.page}
                label={`p.${concept.page} · 예시`}
                onClick={() => jump(concept.page)}
              />
            </Block>

            <Block n="③" title="자주 틀리는 점">
              <p className="text-sm leading-[1.6] text-sub">
                {UNIT.pitfalls[index % UNIT.pitfalls.length]}
              </p>
            </Block>

            <Block n="④" title="한 줄 정리">
              <p className="text-[15px] leading-[1.55] font-bold">{concept.point}</p>
            </Block>
          </div>

          <div className="flex gap-2 border-t border-line px-6 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
            {prev && (
              <Button to={`/learn?c=${prev.id}`} variant="secondary" className="w-[34%]">
                이전 개념
              </Button>
            )}
            {next ? (
              <Button to={`/learn?c=${next.id}`} className="flex-1">
                다음 개념
              </Button>
            ) : (
              <Button to="/quiz" className="flex-1">
                학습 완료 · 개념 확인
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Block({ n, title, children }) {
  return (
    <section className="flex flex-col gap-[10px]">
      <p className="text-[13px] font-bold text-sub">
        {n} {title}
      </p>
      {children}
    </section>
  )
}

export default function LearnPage() {
  return USE_MOCK ? <MockLearnPage /> : <LiveLearnView />
}
