import { api, unwrap } from './client'
import { useSettingsStore } from '@/stores/useSettingsStore'

// GET /ai/models → [{ id, provider, label, available }]
export const listAIModels = () => api.get('/ai/models').then(unwrap)

/**
 * AI 생성 요청(POST)에 넣을 model_id (명세상 필수 · 허용 목록 밖이면 422)
 * 설정(aiModelId) → .env.local 의 VITE_AI_MODEL_ID → 사용 가능한 첫 모델 순서로 골라요
 */
let modelsPromise = null
export async function resolveModelId() {
  modelsPromise ??= listAIModels().catch((err) => {
    modelsPromise = null
    throw err
  })
  const available = ((await modelsPromise) ?? []).filter((m) => m.available)
  const preferred = [useSettingsStore.getState().aiModelId, import.meta.env.VITE_AI_MODEL_ID]
  const pick = preferred.map((id) => available.find((m) => m.id === id)).find(Boolean) ?? available[0]
  if (!pick) throw { code: 'NO_MODEL', message: '지금 사용할 수 있는 AI 모델이 없어요.' }
  return pick.id
}
