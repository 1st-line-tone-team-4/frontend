import { useMaterialJob, useRecoverMaterialJob } from '@/hooks/useMaterialApi'
import Button from './Button'

export default function MaterialRecovery({ material }) {
  const jobQuery = useMaterialJob(material)
  const job = jobQuery.data
  const recovery = useRecoverMaterialJob(material, job)
  if (!material || material.processing_status !== 'failed') return null
  const safe = job?.status === 'failed' && job.retryable && job.attempt_no < 3
  const restartable = job?.status === 'outcome_unknown' || (job?.status === 'failed' && !safe)
  const act = () => {
    const modelId = window.prompt(
      '처음 분석에 사용한 모델 ID를 확인해 주세요. 재시도는 같은 모델만 허용해요.',
      recovery.modelId || '',
    )
    if (!modelId?.trim()) return
    if (
      restartable &&
      !window.confirm(
        '이전 AI 호출에 이미 비용이 발생했을 수 있어요. 같은 분석을 다시 시작하면 중복 비용이 발생할 수 있다는 점에 동의하나요?',
      )
    )
      return
    recovery.mutate(
      { restart: restartable, acknowledge: restartable, modelId: modelId.trim() },
      { onError: (e) => !e.canceled && alert(e.message) },
    )
  }
  return (
    <section
      className="flex flex-col gap-2 rounded-xl border border-line p-3 text-sm"
      aria-live="polite"
    >
      <p>
        {job?.status === 'outcome_unknown'
          ? '분석 결과를 확정할 수 없어요. 비용이 발생했을 수 있어요.'
          : '분석이 완료되지 않았어요.'}
      </p>
      {job && (
        <p className="text-xs text-sub">
          {job.error_code} · 시도 {job.attempt_no}/3
        </p>
      )}
      {(safe || restartable) && (
        <Button disabled={recovery.isPending} onClick={act}>
          {safe ? '같은 분석 안전 재시도' : '비용 가능성 확인 후 다시 시작'}
        </Button>
      )}
      {jobQuery.isError && (
        <Button variant="secondary" onClick={() => jobQuery.refetch()}>
          작업 상태 다시 확인
        </Button>
      )}
      <p className="text-xs text-sub">
        API 키는 연결 설정에서 다시 입력할 수 있어요. 자동으로 재시작하지 않으며 다른 학습으로
        이동해도 돼요.
      </p>
    </section>
  )
}
