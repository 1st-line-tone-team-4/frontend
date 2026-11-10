import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import JobActionStatus from '@/components/JobActionStatus'
import { CheckIcon } from '@/components/icons'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import { useCompleteTeachback, useDday, useTeachbackSession } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'

const STEPS = ['대화 정리', '확인 항목과 비교', '근거 페이지 찾기']

export default function TeachAnalyzingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dday = useDday()
  const savedSessionId = useStudyStore((s) => s.sessionId)
  const sessionId = params.get('session') ?? savedSessionId
  const session = useTeachbackSession(sessionId)
  const complete = useCompleteTeachback()
  const [mockStarted, setMockStarted] = useState(false)
  const [mockStep, setMockStep] = useState(0)
  const reportUrl = `/report?session=${sessionId ?? ''}${params.get('task') ? `&task=${params.get('task')}` : ''}`
  const done = USE_MOCK
    ? mockStep >= STEPS.length
    : complete.isSuccess || session.data?.status === 'completed'
  const working = USE_MOCK ? mockStarted && !done : complete.isPending

  useEffect(() => {
    if (!USE_MOCK || !mockStarted || mockStep >= STEPS.length) return
    const timer = setTimeout(() => setMockStep((step) => step + 1), 900)
    return () => clearTimeout(timer)
  }, [mockStarted, mockStep])

  useEffect(() => {
    if (done) navigate(reportUrl, { replace: true })
  }, [done, navigate, reportUrl])

  const run = () => {
    if (USE_MOCK) return setMockStarted(true)
    complete.mutate(sessionId)
  }

  return (
    <Screen
      header={{ title: done ? '분석 완료' : working ? '분석 중' : '설명 리포트', dday }}
      bottom={
        <>
          {(USE_MOCK || session.data?.status === 'active') && !complete.blocked && !done && (
            <Button onClick={run} disabled={working}>
              리포트 만들기
            </Button>
          )}
          {!USE_MOCK && session.data?.status === 'report_pending' && !complete.job && (
            <Button
              onClick={() =>
                session.data.latest_job_id
                  ? complete.observeJob(session.data.latest_job_id)
                  : session.refetch()
              }
              variant="secondary"
            >
              진행 상태 새로고침
            </Button>
          )}
          <Button to="/today" variant="secondary">
            오늘로 돌아가기
          </Button>
        </>
      }
      className="gap-8"
    >
      <PageTitle
        title={
          working
            ? '설명을 분석하고 있어요'
            : done
              ? '리포트를 만들었어요'
              : '저장한 설명으로 리포트를 만들어요'
        }
        desc="확정한 확인 항목과 대화를 비교해요. 생성 버튼을 누르면 선택한 AI 모델을 호출하며 제공업체 비용이 발생할 수 있어요."
      />
      {!USE_MOCK && !session.data && <ApiState query={session} empty="분석할 설명이 없어요." />}
      {!USE_MOCK && session.data?.status === 'report_pending' && !complete.job && (
        <p className="text-sm text-sub">
          이미 요청한 리포트를 만들고 있어요. 새 생성 요청 없이 상태를 확인해 주세요.
        </p>
      )}
      {!USE_MOCK && <JobActionStatus action={complete} />}
      <ol className="flex flex-col gap-1">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-[14px] py-3">
            <span
              className={`flex size-8 items-center justify-center rounded-full border text-sm font-bold ${done || (USE_MOCK && index < mockStep) ? 'bg-primary text-white' : 'border-line text-muted'}`}
            >
              {done || (USE_MOCK && index < mockStep) ? <CheckIcon size={16} /> : index + 1}
            </span>
            <span className="text-[15px] font-medium">{label}</span>
          </li>
        ))}
      </ol>
      <BottomNote>진행 단계는 안내예요. 실제 완료 여부는 서버 작업 상태로 확인해요.</BottomNote>
    </Screen>
  )
}
