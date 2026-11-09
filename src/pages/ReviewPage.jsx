import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { ExpandIcon } from '@/components/icons'
import Screen from '@/components/Screen'
import SourceChip from '@/components/SourceChip'
import SourceViewer from '@/components/SourceViewer'
import { REVIEW_ITEMS } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

// A-07 부족한 부분 재학습 · 오류 → 누락 → 부분 순서
export default function ReviewPage() {
  const dday = useDday()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const item = REVIEW_ITEMS[index]
  const isLast = index === REVIEW_ITEMS.length - 1
  const picked = answers[item.id]
  const right = picked !== undefined && picked === item.check.answer

  return (
    <Screen
      header={{ title: '부족한 부분 재학습', dday }}
      bottom={
        isLast ? (
          <>
            <Button to="/teach/prepare?retry=1">재설명하기</Button>
            <div className="flex w-full gap-2">
              <Button to="/quiz?from=review" variant="secondary" className="flex-1 text-[15px]">
                보충 문제 풀기
              </Button>
              <Button to="/learn" variant="secondary" className="flex-1 text-[15px]">
                개념 전체 다시 보기
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)}>다음 항목</Button>
        )
      }
      className="gap-5"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] leading-[1.35] font-bold tracking-[-0.44px]">
            부족한 부분만 다시 볼게요
          </h1>
          <span className="text-sm font-bold text-primary">
            {index + 1} / {REVIEW_ITEMS.length}
          </span>
        </div>
        {/* 항목 스텝 */}
        <ol className="flex gap-2">
          {REVIEW_ITEMS.map((r, i) => (
            <li key={r.id} className="flex-1">
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`flex w-full flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left ${
                  i === index ? 'border-primary bg-primary-soft' : 'border-line'
                }`}
              >
                <Chip tone={r.tone}>{r.verdict}</Chip>
                <span className="line-clamp-1 text-xs font-medium text-sub">{r.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* 항목 카드 */}
      <section
        key={item.id}
        className="animate-pop-in flex flex-col gap-3 rounded-[18px] border border-line p-[18px]"
      >
        <div className="flex items-center gap-2">
          <Chip tone={item.tone}>{item.verdict}</Chip>
          <p className="text-[15px] font-bold">{item.title}</p>
        </div>
        {item.quote && (
          <div className="rounded-xl bg-error-soft/60 px-4 py-3">
            <p className="text-[11px] font-bold text-error">내가 한 말</p>
            <p className="text-sm leading-[1.55] text-sub">{item.quote}</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold text-primary">바른 설명</p>
          <p className="text-[15px] leading-[1.55] font-bold">{item.right}</p>
        </div>
        <div className="rounded-xl bg-cool px-4 py-3">
          <p className="text-sm font-bold">{item.example.en}</p>
          <p className="text-[13px] text-sub">{item.example.ko}</p>
        </div>
        <SourceChip page={item.page} />
      </section>

      {/* 자료 뷰어 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold">근거 자료 · p.{item.page}</p>
          <Link
            to={`/source?page=${item.page}`}
            className="flex items-center gap-1 text-xs font-bold text-sub"
          >
            <ExpandIcon size={12} /> 전체 화면
          </Link>
        </div>
        <div className="max-h-[240px] overflow-y-auto rounded-xl bg-cool p-3">
          <SourceViewer page={item.page} />
        </div>
      </section>

      {/* 확인 질문 */}
      <section className="flex flex-col gap-3 rounded-[18px] bg-primary-soft p-[18px]">
        <p className="text-xs font-bold text-primary">확인 질문 · O / X</p>
        <p className="text-[15px] leading-[1.55] font-bold">{item.check.q}</p>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              disabled={picked !== undefined}
              onClick={() => setAnswers((a) => ({ ...a, [item.id]: v }))}
              className={`h-12 rounded-xl text-lg font-bold ${
                picked === undefined
                  ? 'bg-white text-ink'
                  : v === item.check.answer
                    ? 'bg-primary text-white'
                    : picked === v
                      ? 'bg-error text-white'
                      : 'bg-white text-muted'
              }`}
            >
              {v ? 'O' : 'X'}
            </button>
          ))}
        </div>
        {picked !== undefined && (
          <p
            className={`text-[13px] leading-[1.55] font-medium ${right ? 'text-primary' : 'text-error'}`}
          >
            {right ? '확인됨 · ' : '아쉬워요 · '}
            {item.check.explain}
          </p>
        )}
      </section>
    </Screen>
  )
}
