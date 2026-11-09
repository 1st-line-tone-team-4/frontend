import { useState } from 'react'
import iconAlert from '@/assets/icons/alert-error.svg'
import iconTarget from '@/assets/icons/target.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import ReportSheet from '@/components/ReportSheet'
import Screen, { PageTitle } from '@/components/Screen'
import Source from '@/components/Source'
import {
  useDday,
  useReportFeedback,
  useTeachbackReport,
  useUpdateImprovementAction,
} from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { toPercent } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY = {
  title: '현재완료를 한 번 더 정리해요',
  desc: '방금 마친 설명 · 현재완료',
  coverage: 58,
  basis: '이번 개념의 확정 항목 12개 기준',
  formula: '설명 2점 · 부분 1점 · 누락·오류 0점\n14 / 24점 = 58% (반올림) · 시험 점수가 아니에요',
  results: [
    {
      title: '현재완료 형태 외 4개',
      source: '토익 문법 정리.pdf p.24',
      tone: 'primary',
      label: '설명됨 · 5개',
    },
    {
      title: '계속 용법·예시 외 2개',
      source: '토익 문법 정리.pdf p.24–25',
      tone: 'secondary',
      label: '부분 설명 · 4개',
    },
    {
      title: 'since·for 구분',
      source: '토익 문법 정리.pdf p.25',
      tone: 'cool',
      label: '누락 · 2개',
    },
    {
      title: '과거 시점 부사 사용',
      source: '토익 문법 정리.pdf p.24',
      tone: 'error',
      label: '오류 · 1개',
    },
  ],
  error: {
    quote: '“yesterday 같은 과거 시점 부사와도 쓸 수 있어요.”',
    title: '분명한 과거 시점에는 과거시제를 써요.',
    desc: '현재완료는 yesterday, last year처럼 과거 시점이 분명한 부사와 함께 쓰지 않아요.',
    source: '토익 문법 정리.pdf p.24',
  },
  nextAction: '자료 p.24를 읽고 현재완료와 과거시제의 차이를 다시 설명해요.',
  actionId: null,
}

const STATUS = [
  { key: 'explained', tone: 'primary', label: '설명됨' },
  { key: 'partial', tone: 'secondary', label: '부분 설명' },
  { key: 'omission', tone: 'cool', label: '누락' },
  { key: 'error', tone: 'error', label: '오류' },
  { key: 'unverified', tone: 'outline', label: '근거 확인 불가' },
]

const sourceOf = (item) => {
  const e = item?.evidence?.[0]
  return e ? `${e.material_name} p.${e.page_number}` : null
}

// API 리포트 → 화면 데이터 (상태별로 묶어서 '첫 항목 외 n개')
function toView(report) {
  const pct = toPercent(report.coverage)
  const results = STATUS.map((s) => {
    const items = report.items.filter((it) => it.status === s.key)
    if (items.length === 0) return null
    return {
      title:
        items.length > 1
          ? `${items[0].description} 외 ${items.length - 1}개`
          : items[0].description,
      source: sourceOf(items[0]),
      tone: s.tone,
      label: `${s.label} · ${items.length}개`,
    }
  }).filter(Boolean)
  const err = report.items.find((it) => it.status === 'error')

  return {
    title: '설명을 한 번 더 정리해요',
    desc: `방금 마친 설명 · 기준 버전 v${report.version_no}`,
    coverage: pct,
    basis: `평가 가능한 확인 항목 ${report.assessable_count}개 기준`,
    formula: `${report.coverage_formula}\n${report.weighted_score} / ${report.assessable_count}점${pct !== null ? ` = ${pct}%` : ''} · 시험 점수가 아니에요`,
    results,
    error: err && { title: err.description, source: sourceOf(err) },
    nextAction: report.next_action,
    actionId: report.action_id,
  }
}

const PASS = 80 // 다음 개념으로 넘어가는 설명률 기준 (제안)

// 12 약점 리포트
export default function ReportPage() {
  const [nextDone, setNextDone] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const dday = useDday()
  const sessionId = useStudyStore((s) => s.sessionId)
  const report = useTeachbackReport()
  const updateAction = useUpdateImprovementAction()
  const feedback = useReportFeedback()

  const view = USE_MOCK ? DUMMY : report.data ? toView(report.data) : null
  const header = { title: '약점 리포트', dday }

  if (!view) {
    return (
      <Screen header={header}>
        <ApiState
          query={sessionId ? report : undefined}
          empty="아직 리포트가 없어요."
          action={{ label: '설명하러 가기', to: '/teach/prepare' }}
        />
      </Screen>
    )
  }

  const onToggleNext = (checked) => {
    setNextDone(checked)
    if (!view.actionId) return
    updateAction.mutate(
      { actionId: view.actionId, status: checked ? 'completed' : 'pending' },
      {
        onError: (err) => {
          setNextDone(!checked)
          alert(err.message)
        },
      },
    )
  }

  const onFeedback = ({ reason, comment }) => {
    if (USE_MOCK) return Promise.resolve()
    const REASON = {
      '판정이 틀림': 'incorrect',
      '근거가 맞지 않음': 'unsupported',
      '내 말을 잘못 받아씀': 'unclear',
    }
    return feedback.mutateAsync({
      sessionId,
      report_item_id: null,
      reason: REASON[reason] ?? 'other',
      comment: comment || null,
    })
  }

  const retryLink = USE_MOCK ? '/teach/prepare?retry=1' : `/teach/prepare?retry=1&prev=${sessionId}`
  const passed = (view.coverage ?? 0) >= PASS
  const lastConceptOfUnit = true // 목 시나리오: 현재완료가 단원의 마지막 개념

  return (
    <Screen
      header={header}
      bottom={
        passed ? (
          <>
            <Button to="/unit">다음 개념으로</Button>
            {lastConceptOfUnit && (
              <Button to="/quiz/advanced" variant="secondary">
                심화 문제 풀기
              </Button>
            )}
          </>
        ) : (
          <>
            <Button to="/review">부족한 부분 재학습</Button>
            <div className="flex w-full gap-2">
              <Button to={retryLink} variant="secondary" className="flex-1 text-[15px]">
                다시 설명하기
              </Button>
              <Button to="/quiz?from=review" variant="secondary" className="flex-1 text-[15px]">
                보충 문제 풀기
              </Button>
            </div>
          </>
        )
      }
      className="gap-5"
    >
      <PageTitle title={view.title} desc={view.desc} />

      {/* 설명률 (그라데이션/기록) */}
      <div className="flex flex-col gap-[6px] rounded-[18px] bg-[linear-gradient(145deg,#5f8ff5_0%,var(--color-secondary)_74%)] px-5 py-[18px] text-white">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-[2px] leading-[1.4]">
            <p className="text-sm font-bold">확인 항목 설명률</p>
            <p className="text-xs text-white/82">{view.basis}</p>
          </div>
          <p className="text-[38px] leading-[1.1] font-bold tracking-[-0.76px]">
            {view.coverage !== null ? `${view.coverage}%` : '-'}
          </p>
        </div>
        <div className="pt-2 pb-1">
          <div className="h-[6px] overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${view.coverage ?? 0}%` }}
            />
          </div>
        </div>
        <p className="text-[11px] leading-[1.55] whitespace-pre-line text-white/85">
          {view.formula}
        </p>
      </div>

      <section>
        <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">
          무엇을 설명했고, 무엇이 빠졌나요?
        </h2>
        <ul>
          {view.results.map((r, i) => (
            <li key={r.label}>
              {i > 0 && <Divider />}
              <div className="flex items-center gap-[10px] py-3">
                <div className="flex flex-1 flex-col gap-[2px]">
                  <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">{r.title}</p>
                  {r.source && <Source>{r.source}</Source>}
                </div>
                <Chip tone={r.tone}>{r.label}</Chip>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {view.error && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-cool p-4">
          <div>
            <Chip tone="error">
              <img src={iconAlert} alt="" className="size-[11px]" />내 설명에서 발견한 오류
            </Chip>
          </div>
          {view.error.quote && (
            <p className="text-sm leading-[1.55] font-medium text-sub">{view.error.quote}</p>
          )}
          <p className="text-[15px] leading-[1.45] font-bold tracking-[-0.15px]">
            {view.error.title}
          </p>
          {view.error.desc && (
            <p className="text-[13px] leading-[1.55] text-sub">{view.error.desc}</p>
          )}
          {view.error.source && <Source>{view.error.source}</Source>}
        </div>
      )}

      {view.nextAction && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-primary-soft px-4 py-[14px]">
          <p className="flex items-center gap-[6px] text-sm leading-[1.4] font-bold text-primary">
            <img src={iconTarget} alt="" className="size-4" />
            다음에는 이것 하나만
          </p>
          <label className="flex cursor-pointer items-start gap-[10px]">
            <input
              type="checkbox"
              checked={nextDone}
              onChange={(e) => onToggleNext(e.target.checked)}
              className="mt-[2px] size-[18px] shrink-0 appearance-none rounded-[5px] border-[1.5px] border-primary bg-white checked:bg-primary"
            />
            <span
              className={`text-sm leading-[1.55] font-medium ${nextDone ? 'text-sub line-through' : ''}`}
            >
              {view.nextAction}
            </span>
          </label>
        </div>
      )}

      <p className="flex items-center justify-center gap-[6px] text-xs leading-[1.3]">
        <span className="text-muted">재설명은 이번 설명과 연결해 비교해요.</span>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="font-bold text-sub underline"
        >
          평가 신고
        </button>
      </p>
      <ReportSheet
        open={reportOpen}
        kind="evaluation"
        onClose={() => setReportOpen(false)}
        onSubmit={onFeedback}
      />
    </Screen>
  )
}
