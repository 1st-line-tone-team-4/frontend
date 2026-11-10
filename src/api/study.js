import {
  api,
  uploadApi,
  unwrap,
  unwrapList,
  requestOptions,
  mutationOptions,
  ApiError,
  resourceId,
  captureSession,
  assertSession,
} from './client.js'
import { useAiStore } from '../stores/useAiStore.js'

const pathId = resourceId
const get = (path, params, options, list = false) =>
  api.get(path, { ...requestOptions(options), params }).then(list ? unwrapList : unwrap)
const patch = (path, body, options) => api.patch(path, body, requestOptions(options)).then(unwrap)
export function post(path, body, options = {}, ai = false) {
  let modelId
  let config
  if (ai) {
    modelId = options.modelId ?? body.model_id ?? useAiStore.getState().modelId
    if (typeof modelId !== 'string' || !modelId.trim())
      throw new ApiError('Select an AI model first.', { code: 'MODEL_REQUIRED' })
    config = mutationOptions(
      { ...options, providerApiKey: useAiStore.getState().providerApiKey },
      { requiresProviderKey: true },
    )
    body = { ...body, model_id: modelId }
  } else config = mutationOptions(options)
  return api
    .post(path, body, config)
    .then(unwrap)
    .then((data) =>
      data?.job && modelId ? { ...data, job: { ...data.job, model_id: modelId } } : data,
    )
}
export const getMe = (options = {}) => get('/me', undefined, options)
export const listModels = (options = {}) => get('/ai/models', undefined, options)
export const validateAiKey = (options = {}) => post('/ai/validate-key', {}, options, true)
export const listExamGoals = (params, options = {}) => get('/exam-goals', params, options, true)
export const createExamGoal = (body, options = {}) => post('/exam-goals', body, options)
export const updateExamGoal = (id, body, options = {}) =>
  patch(`/exam-goals/${pathId(id)}`, body, options)
export const createMaterialUpload = (file, options = {}) =>
  post('/materials', { filename: file.name, mime_type: file.type, size_bytes: file.size }, options)
export async function putFileToSignedUrl(url, file, options = {}) {
  const version = captureSession()
  const parsed = new URL(url, globalThis.location?.origin ?? 'http://localhost')
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new ApiError('Invalid upload URL.', { code: 'INVALID_REQUEST' })
  assertSession(version, options.signal)
  const result = await uploadApi.put(url, file, {
    signal: options.signal,
    headers: { 'Content-Type': file.type },
  })
  assertSession(version, options.signal)
  return result
}
export const completeMaterialUpload = (id, options = {}) =>
  post(`/materials/${pathId(id)}/complete`, {}, options, true)
export const listMaterials = (params, options = {}) => get('/materials', params, options, true)
export const getMaterial = (id, options = {}) => get(`/materials/${pathId(id)}`, undefined, options)
export const deleteMaterial = (id, options = {}) =>
  api.delete(`/materials/${pathId(id)}`, requestOptions(options))
export const archiveMaterial = (id, archived, options = {}) =>
  patch(`/materials/${pathId(id)}`, { archived }, options)
export const getMaterialSource = (id, page = 1, options = {}) =>
  get(`/materials/${pathId(id)}/source`, { page }, options)
export const listUnits = (id, options = {}) =>
  get(`/materials/${pathId(id)}/units`, undefined, options)
export const listConcepts = (id, options = {}) =>
  get(`/materials/${pathId(id)}/concepts`, undefined, options)
export const confirmConcepts = (id, concepts, options = {}) =>
  patch(`/materials/${pathId(id)}/concepts`, { concepts }, options)
export const createStudyPlan = (body, options = {}) => post('/study-plans', body, options)
export const listStudyPlans = (params, options = {}) => get('/study-plans', params, options, true)
export const getStudyPlan = (id, options = {}) =>
  get(`/study-plans/${pathId(id)}`, undefined, options)
export const rescheduleStudyPlan = (id, body = {}, options = {}) =>
  post(`/study-plans/${pathId(id)}/reschedule`, body, options)
export const getToday = (params, options = {}) => get('/today', params, options)
export const createQuestionSet = (body, options = {}) => post('/question-sets', body, options, true)
export const getQuestionSet = (id, options = {}) =>
  get(`/question-sets/${pathId(id)}`, undefined, options)
export const submitAttempt = (id, body, options = {}) =>
  post(`/questions/${pathId(id)}/attempts`, body, options, true)
export const getAttempt = (id, options = {}) => get(`/attempts/${pathId(id)}`, undefined, options)
export const listLearningExplanations = (id, options = {}) =>
  get('/learning-explanations', { concept_version_id: id }, options, true)
export const createLearningExplanation = (body, options = {}) =>
  post('/learning-explanations', body, options, true)
export const getLearningExplanation = (id, options = {}) =>
  get(`/learning-explanations/${pathId(id)}`, undefined, options)
export const createTeachbackSession = (body, options = {}) =>
  post('/teachback-sessions', body, options)
export const getTeachbackSession = (id, options = {}) =>
  get(`/teachback-sessions/${pathId(id)}`, undefined, options)
export const listTeachbackMessages = (id, options = {}) =>
  get(`/teachback-sessions/${pathId(id)}/messages`, { limit: 100 }, options, true)
const mode = (value) => (value === 'voice' ? 'voice_transcript' : value)
export const sendTeachbackMessage = (id, content, inputMode = 'text', options = {}) =>
  post(
    `/teachback-sessions/${pathId(id)}/messages`,
    { content, input_mode: mode(inputMode) },
    options,
    true,
  )
export const submitFinalTeachbackAnswer = (id, content, inputMode = 'text', options = {}) =>
  post(
    `/teachback-sessions/${pathId(id)}/final-answer`,
    { content, input_mode: mode(inputMode) },
    options,
  )
export const completeTeachbackSession = (id, options = {}) =>
  post(`/teachback-sessions/${pathId(id)}/complete`, {}, options, true)
export const getTeachbackReport = (id, options = {}) =>
  get(`/teachback-sessions/${pathId(id)}/report`, undefined, options)
export const reportTeachbackFeedback = (id, body, options = {}) =>
  post(`/teachback-sessions/${pathId(id)}/feedback`, body, options)
export const listWeaknesses = (params, options = {}) =>
  get('/records/weaknesses', params, options, true)
export const listSessionRecords = (params, options = {}) =>
  get('/records/sessions', params, options, true)
export const updateImprovementAction = (id, body, options = {}) =>
  patch(`/records/actions/${pathId(id)}`, body, options)
export const updatePlanTask = (id, body, options = {}) =>
  patch(`/plan-tasks/${pathId(id)}`, body, options)
export const listImprovementActions = (params, options = {}) =>
  get('/records/actions', params, options, true)
export const abandonTeachbackSession = (id, options = {}) =>
  patch(`/teachback-sessions/${pathId(id)}`, { status: 'abandoned' }, options)
export const getMaterialChunk = (materialId, chunkId, options = {}) =>
  get(`/materials/${pathId(materialId)}/chunks/${pathId(chunkId)}`, undefined, options)
