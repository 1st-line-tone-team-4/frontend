import { useState } from 'react'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { CheckIcon } from '@/components/icons'
import { BottomSheet } from '@/components/Overlay'
import Screen, { PageTitle } from '@/components/Screen'
import { BANK_SETS } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

const KEYWORDS = ['전체', '토익 RC', '토익 LC', '영문법']
const LEVELS = ['전체', '하', '중', '상']

function FilterRow({ options, value, onChange, label }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`shrink-0 rounded-full px-3 py-[6px] text-[13px] font-bold ${
            value === o ? 'bg-ink text-white' : 'bg-cool text-sub'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// A-12 문제은행 추천 · 모의고사 뒤 내 약한 개념과 비슷한 공개 문제
export default function BankPage() {
  const dday = useDday()
  const [keyword, setKeyword] = useState('전체')
  const [level, setLevel] = useState('전체')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [preview, setPreview] = useState(null)

  const sets = BANK_SETS.filter(
    (s) =>
      (keyword === '전체' || s.keyword === keyword) &&
      (level === '전체' || s.level === level) &&
      (!verifiedOnly || s.verified),
  )

  return (
    <Screen header={{ title: '비슷한 문제 더 풀기', dday }} className="gap-5">
      <PageTitle title="다른 사람은 이렇게 풀었어요" />
      <p className="rounded-xl bg-cool px-4 py-3 text-[13px] leading-[1.55] text-sub">
        모의고사에서 틀린 개념: <b className="text-ink">과거 시점 부사, since와 for</b>
      </p>

      {/* 인증 묶음 */}
      <button
        type="button"
        onClick={() => setVerifiedOnly((v) => !v)}
        className={`flex flex-col gap-1 rounded-[18px] px-5 py-4 text-left text-white ${
          verifiedOnly ? 'ring-4 ring-primary/30' : ''
        } bg-[linear-gradient(147deg,#4e68b0_0%,var(--color-logo-navy)_74%)]`}
      >
        <span className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/80">인증 묶음</span>
          {verifiedOnly && <CheckIcon size={18} />}
        </span>
        <span className="text-[17px] font-bold">토익 900점 이상 인증자가 푼 문제</span>
        <span className="text-xs text-white/80">
          인증자 12명 · 점수 구간과 인증자 수만 공개돼요
        </span>
      </button>

      <div className="flex flex-col gap-2">
        <FilterRow label="시험 키워드" options={KEYWORDS} value={keyword} onChange={setKeyword} />
        <FilterRow label="난이도" options={LEVELS} value={level} onChange={setLevel} />
      </div>

      {sets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-sub">아직 비슷한 공개 문제가 없어요.</p>
          <Button to="/quiz" variant="secondary" className="w-auto px-6">
            내 자료로 문제 더 만들기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sets.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-[6px]">
                <Chip tone="cool">{s.keyword}</Chip>
                <Chip tone={s.level === '상' ? 'error' : 'primary'}>난이도 {s.level}</Chip>
                {s.verified && <Chip tone="secondary">900+ 인증</Chip>}
              </div>
              <p className="text-[15px] leading-[1.45] font-bold">{s.title}</p>
              <p className="text-xs text-sub">
                {s.count}문제 · {s.solved}명이 풀었어요 · 관련 개념 {s.concepts.join(', ')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-10 flex-1 text-sm"
                  onClick={() => setPreview(s)}
                >
                  미리보기
                </Button>
                <Button to={`/bank/solve?set=${s.id}`} className="h-10 flex-1 text-sm">
                  풀기
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-center text-xs leading-[1.5] text-muted">
        공개 문제 · 정답 · 해설만 보여요. 만든 사람의 원본 자료와 페이지는 공개하지 않아요.
      </p>

      <BottomSheet
        open={!!preview}
        title={preview?.title}
        onClose={() => setPreview(null)}
        footer={<Button to={`/bank/solve?set=${preview?.id}`}>이 세트 풀기</Button>}
      >
        {preview && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['문항 수', `${preview.count}문제`],
              ['정답 · 해설', '포함'],
              ['난이도', preview.level],
              ['만든 날짜', '2026.11.02'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-cool px-4 py-3">
                <dt className="text-xs text-sub">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </BottomSheet>
    </Screen>
  )
}
