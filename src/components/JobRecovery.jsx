import { useState } from 'react'
import { canRestartJob, canRetryJob } from '@/api/jobs'
import { useRecoverJob } from '@/hooks/useStudyApi'
import Button from './Button'
import { Modal, toast } from './Overlay'

/**
 * 실패하거나 결과를 알 수 없는 AI 작업 복구 버튼
 * - failed + retryable + 3회 미만 → 다시 시도 (POST /jobs/{id}/retry · 같은 job)
 * - 그 외 failed · outcome_unknown → 다시 실행 (POST /jobs/{id}/restart · 중복 실행 동의 후)
 * - modelId: 처음 요청한 모델 (명세: 같은 모델만 허용) · onRecovered(newJob)
 */
export default function JobRecovery({ job, modelId, onRecovered, className = '' }) {
  const recover = useRecoverJob()
  const [confirm, setConfirm] = useState(false)
  if (!job || !(canRetryJob(job) || canRestartJob(job))) return null

  const run = () =>
    recover.mutate(
      { job, modelId },
      {
        onSuccess: (next) => {
          setConfirm(false)
          onRecovered?.(next)
        },
        onError: (err) => {
          setConfirm(false)
          toast(err.message)
        },
      },
    )

  return (
    <>
      <Button
        variant="secondary"
        className={`w-auto px-6 ${className}`}
        disabled={recover.isPending}
        onClick={() => (canRetryJob(job) ? run() : setConfirm(true))}
      >
        {canRetryJob(job) ? `다시 시도 (${job.attempt_no ?? 1}/3)` : '다시 실행하기'}
      </Button>
      <Modal
        open={confirm}
        title="다시 실행할까요?"
        desc={'이전 작업이 이미 처리됐을 수도 있어요.\n다시 실행하면 같은 작업이 한 번 더 처리될 수 있어요.'}
        confirmLabel="다시 실행"
        onConfirm={run}
        onClose={() => setConfirm(false)}
      />
    </>
  )
}
