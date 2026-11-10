import { canRetryJob, canRestartJob } from '@/utils/studyModel'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button'

export default function JobActionStatus({ action }) {
  const [acknowledge, setAcknowledge] = useState(false)
  if (!action) return null
  const { job, error, isPending } = action
  if (!job && !error && !isPending && !action.blocked) return null
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-cool p-4 text-sm" aria-live="polite">
      {isPending && <p>요청 상태를 확인하고 있어요. 화면을 닫아도 서버 작업은 계속될 수 있어요.</p>}
      {error && (
        <p role="alert">
          {['JOB_TIMEOUT', 'JOB_OBSERVATION_TIMEOUT'].includes(error.code)
            ? '대기 시간이 지났어요. 작업 실패는 아니에요. 상태만 다시 확인해 주세요.'
            : error.message}
        </p>
      )}
      {['MODEL_REQUIRED', 'INVALID_REQUEST'].includes(error?.code) && (
        <Link to="/login" className="font-bold text-primary">
          연결 및 AI 설정 확인
        </Link>
      )}
      {job && <p>작업 상태: {job.status}</p>}
      {job && !job.model_id && (canRetryJob(job) || canRestartJob(job)) && (
        <p>원래 모델을 확인할 수 없어 다시 호출하지 않아요. 상태 조회만 가능해요.</p>
      )}
      {!isPending && job && (job.status !== 'succeeded' || action.blocked) && (
        <Button variant="secondary" onClick={action.retryPolling}>
          작업 상태 다시 확인
        </Button>
      )}
      {!isPending && !job && action.blocked && (
        <Button variant="secondary" onClick={action.repeatRequest}>
          같은 요청 확인 · 새 작업을 만들지 않아요
        </Button>
      )}
      {!isPending && canRetryJob(job) && job.model_id && (
        <Button onClick={() => action.recoverJob()}>실패 작업 재시도</Button>
      )}
      {!isPending && canRestartJob(job) && job.model_id && (
        <>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
            />
            이전 호출 비용이 발생했을 수 있고, 새 호출로 추가 비용이 생길 수 있음을 확인했어요.
          </label>
          <Button
            disabled={!acknowledge}
            onClick={() => action.recoverJob({ restart: true, acknowledge })}
          >
            동의하고 작업 다시 시작
          </Button>
        </>
      )}
    </section>
  )
}
