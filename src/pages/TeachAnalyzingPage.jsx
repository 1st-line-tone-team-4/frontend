import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import { waitForJob } from '@/api/jobs'
import Button from '@/components/Button'
import { CheckIcon } from '@/components/icons'
import JobRecovery from '@/components/JobRecovery'
import { toast } from '@/components/Overlay'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import { useAbandonSession, useCompleteTeachback, useDday } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'

const STEPS = ['대화 정리', '확인 항목과 대조', '근거 페이지 찾기']

// A-06 분석 중 · 완료되면 자동으로 12 약점 리포트
export default function TeachAnalyzingPage() {
  const navigate = useNavigate()
  const dday = useDday()
  const sessionId = useStudyStore((s) => s.sessionId)
  const complete = useCompleteTeachback()
  const [step, setStep] = useState(0)
  const [failed, setFailed] = useState(false)
  const [failedJob, setFailedJob] = useState(null) // 실패한 리포트 job (retry · restart 대상)
  const abandon = useAbandonSession()
  const started = useRef(false)

  const onFail = (err) => {
    setFailed(true)
    setFailedJob(err?.job ?? null)
  }

  const run = () => {
    setFailed(false)
    setStep(0)
    if (USE_MOCK) return
    complete.mutate(sessionId, { onSuccess: () => setStep(STEPS.length), onError: onFail })
  }

  // 명세: 리포트 job 실패는 같은 세션을 /jobs retry · restart 로 복구해요 (complete 를 다시 부르면 기존 job 이 와요)
  const onRecovered = (job) => {
    setFailed(false)
    setFailedJob(null)
    setStep(STEPS.length - 1)
    waitForJob(job)
      .then(() => setStep(STEPS.length))
      .catch(onFail)
  }

  // 리포트 없이 끝난 세션은 중단할 수 있어요 (PATCH status=abandoned · 대화 기록은 남아요)
  const onAbandon = () =>
    abandon.mutate(sessionId, {
      onSuccess: () => navigate('/today', { replace: true }),
      onError: (err) => toast(err.message),
    })

  useEffect(() => {
    if (started.current) return
    started.current = true
    run()
    // eslint-disable-next-line
  }, [])

  // 단계 진행 연출 (실제 모드에서는 마지막 단계에서 서버 완료를 기다려요)
  useEffect(() => {
    if (failed) return
    if (step >= STEPS.length) {
      const t = setTimeout(() => navigate('/report', { replace: true }), 600)
      return () => clearTimeout(t)
    }
    if (!USE_MOCK && step === STEPS.length - 1) return
    const t = setTimeout(() => setStep((s) => s + 1), 1300)
    return () => clearTimeout(t)
  }, [step, failed, navigate])

  const progress = Math.round((Math.min(step, STEPS.length) / STEPS.length) * 100)

  return (
    <Screen
      header={{ title: '분석 중', dday }}
      bottom={
        <>
          {failed &&
            (failedJob ? (
              <JobRecovery job={failedJob} onRecovered={onRecovered} className="w-full" />
            ) : (
              <Button onClick={run}>다시 분석하기</Button>
            ))}
          {failed && failedJob && (
            <Button variant="secondary" onClick={onAbandon} disabled={abandon.isPending}>
              이번 설명 그만두기
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
        title={failed ? '분석하지 못했어요' : '설명을 분석하고 있어요'}
        desc={
          failed
            ? '대화는 그대로 남아 있어요. 다시 분석해 주세요.'
            : '확정한 확인 항목과 내 설명을 하나씩 대조해요.'
        }
      />

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-sub">진행</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cool">
          <div
            className="h-full rounded-full bg-progress transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-1">
        {STEPS.map((s, i) => {
          const done = i < step
          const now = i === step && !failed
          return (
            <li key={s} className="flex items-center gap-[14px] py-3">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? 'bg-primary text-white'
                    : now
                      ? 'border-2 border-primary text-primary'
                      : 'border-[1.5px] border-line text-muted'
                }`}
              >
                {done ? (
                  <CheckIcon size={16} />
                ) : now ? (
                  <span className="size-3 animate-ping rounded-full bg-primary" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-[15px] ${done || now ? 'font-bold' : 'font-medium text-muted'}`}
              >
                {s}
              </span>
              {now && <span className="ml-auto text-xs font-medium text-primary">진행 중</span>}
            </li>
          )
        })}
      </ol>

      <BottomNote>화면을 나가도 리포트는 저장돼요.</BottomNote>
    </Screen>
  )
}
