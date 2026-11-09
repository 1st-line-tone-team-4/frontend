import { api, unwrap } from './client'

// 비동기 작업(AI 분석·생성·채점·리포트) 상태
export const getJob = (jobId) => api.get(`/jobs/${jobId}`).then(unwrap)
export const retryJob = (jobId) => api.post(`/jobs/${jobId}/retry`, {}).then(unwrap)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 202 Accepted 로 받은 job 이 끝날 때까지 기다려요. 성공하면 job 을 반환, 실패하면 오류를 던져요
export async function waitForJob(job, { interval = 1500, timeout = 180_000 } = {}) {
  const started = Date.now()
  let current = job
  while (current.status === 'queued' || current.status === 'running') {
    if (Date.now() - started > timeout) {
      throw {
        code: 'JOB_TIMEOUT',
        message: '처리 시간이 오래 걸리고 있어요. 잠시 후 다시 확인해 주세요.',
      }
    }
    await sleep(interval)
    current = await getJob(current.id)
  }
  if (current.status !== 'succeeded') {
    throw {
      code: current.error_code ?? 'JOB_FAILED',
      message: 'AI 처리에 실패했어요. 다시 시도해 주세요.',
      job: current,
    }
  }
  return current
}
