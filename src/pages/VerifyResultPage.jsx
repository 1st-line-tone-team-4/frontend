import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { AlertIcon, CheckIcon, ClockIcon } from '@/components/icons'
import { Segment } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import { useDday } from '@/hooks/useStudyApi'

const STATES = { review: '검수 중', approved: '승인', rejected: '반려' }

// A-15 인증 결과 · 한 화면에서 검수 중 · 승인 · 반려 상태를 바꿔 보여 줘요
export default function VerifyResultPage() {
  const dday = useDday()
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'review')

  const bottom = (
    <>
      {status === 'rejected' && <Button to="/records/verify">다시 제출하기</Button>}
      {status === 'approved' && <Button to="/bank">문제은행 보기</Button>}
      <Button to="/records" variant={status === 'review' ? 'primary' : 'secondary'}>
        기록에서 보기
      </Button>
    </>
  )

  return (
    <Screen header={{ title: '인증 결과', dday }} bottom={bottom} className="gap-6">
      {/* 시안 확인용 상태 전환 */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold text-muted">시안 상태 미리보기</p>
        <Segment
          options={Object.values(STATES)}
          value={STATES[status]}
          onChange={(v) => setStatus(Object.keys(STATES).find((k) => STATES[k] === v))}
        />
      </div>

      {status === 'review' && (
        <>
          <Hero icon={<ClockIcon size={30} />} tone="bg-primary-soft text-primary" />
          <PageTitle title="성적표를 검수하고 있어요" desc="결과가 나오면 알려드려요." />
          <Rows
            rows={[
              ['제출일', '2026.11.09'],
              ['예상 소요 기간', '영업일 기준 1~3일 (미정)'],
              ['시험', '토익 정기시험 · 925점'],
            ]}
          />
        </>
      )}
      {status === 'approved' && (
        <>
          <Hero icon={<CheckIcon size={30} />} tone="bg-primary text-white" />
          <PageTitle title="점수 인증이 완료됐어요" />
          <div className="flex items-center justify-center">
            <Chip tone="secondary" className="px-4 py-2 text-sm">
              토익 900점 이상 인증
            </Chip>
          </div>
          <Rows
            rows={[
              ['공개 범위', '점수 구간과 인증자 수만 공개돼요'],
              ['인증 표시가 붙은 내 공개 문제', '3세트'],
            ]}
          />
        </>
      )}
      {status === 'rejected' && (
        <>
          <Hero icon={<AlertIcon size={30} />} tone="bg-error-soft text-error" />
          <PageTitle title="인증이 반려됐어요" desc="아래 사유를 확인하고 다시 제출해 주세요." />
          <div className="rounded-2xl border border-error/30 bg-error-soft/50 px-4 py-[14px]">
            <p className="text-xs font-bold text-error">반려 사유</p>
            <p className="text-sm leading-[1.6]">
              성적표가 흐려서 점수와 응시일을 확인할 수 없어요.
            </p>
          </div>
          <p className="text-[13px] text-sub">기존에 입력한 내용은 그대로 남아 있어요.</p>
        </>
      )}
    </Screen>
  )
}

function Hero({ icon, tone }) {
  return (
    <div className="flex justify-center pt-4">
      <span className={`flex size-20 items-center justify-center rounded-full ${tone}`}>
        {icon}
      </span>
    </div>
  )
}

function Rows({ rows }) {
  return (
    <dl className="flex flex-col divide-y divide-line rounded-2xl bg-cool px-4">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-3 text-sm">
          <dt className="text-sub">{k}</dt>
          <dd className="text-right font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
