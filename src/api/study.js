import { api, unwrap, unwrapList } from './client'

/* ── 사용자 · 시험 목표 ───────────────────────── */
export const getMe = () => api.get('/me').then(unwrap)
// 월 구독 정책 · 현재 상태 → { mode, subscription_status, checkout_enabled }
export const getBillingCapabilities = () => api.get('/billing/capabilities').then(unwrap)
export const listExamGoals = (params) => api.get('/exam-goals', { params }).then(unwrapList)
// body: { title, exam_type: school_exam|toeic|toefl|entrance_exam|other, exam_date: 'YYYY-MM-DD' }
export const createExamGoal = (body) => api.post('/exam-goals', body).then(unwrap)
export const updateExamGoal = (goalId, body) =>
  api.patch(`/exam-goals/${goalId}`, body).then(unwrap)

/* ── 자료 ─────────────────────────────────────── */
// 업로드(POST /materials → PUT 서명 URL → complete)는 materialUpload.js 에 있어요
export const listMaterials = (params) => api.get('/materials', { params }).then(unwrapList)
export const getMaterial = (materialId) => api.get(`/materials/${materialId}`).then(unwrap)
export const deleteMaterial = (materialId) => api.delete(`/materials/${materialId}`)
export const archiveMaterial = (materialId, archived) =>
  api.patch(`/materials/${materialId}`, { archived }).then(unwrap)
export const getMaterialSource = (materialId, page = 1) =>
  api.get(`/materials/${materialId}/source`, { params: { page } }).then(unwrap)
// 근거 원문 → { chunk_id, material_id, material_name, page_number, excerpt }
export const getMaterialChunk = (materialId, chunkId) =>
  api.get(`/materials/${materialId}/chunks/${chunkId}`).then(unwrap)

/* ── 단원 · 개념 ──────────────────────────────── */
export const listUnits = (materialId) => api.get(`/materials/${materialId}/units`).then(unwrap)
export const listConcepts = (materialId) =>
  api.get(`/materials/${materialId}/concepts`).then(unwrap)
// body: { concepts: [{ concept_id, unit_id, base_version_id, name, summary, checklist_items, evidence_chunk_ids }] }
export const confirmConcepts = (materialId, concepts) =>
  api.patch(`/materials/${materialId}/concepts`, { concepts }).then(unwrap)
// 개념 버전 기록 (draft · confirmed 전체)
export const listConceptVersions = (materialId, conceptId) =>
  api.get(`/materials/${materialId}/concepts/${conceptId}/versions`).then(unwrap)

/* ── 계획 · 오늘 ──────────────────────────────── */
export const createStudyPlan = (body) => api.post('/study-plans', body).then(unwrap)
export const listStudyPlans = (params) => api.get('/study-plans', { params }).then(unwrapList)
export const getStudyPlan = (planId) => api.get(`/study-plans/${planId}`).then(unwrap)
export const rescheduleStudyPlan = (planId) =>
  api.post(`/study-plans/${planId}/reschedule`, {}).then(unwrap)
export const getToday = (params) => api.get('/today', { params }).then(unwrap)
// status: pending(건너뜀·복습 완료 취소) | completed(review 만 수동) | skipped(미완료만)
export const updatePlanTask = (taskId, status) =>
  api.patch(`/plan-tasks/${taskId}`, { status }).then(unwrap)

/* ── 문제 ─────────────────────────────────────── */
// body: { unit_id, task_id, concept_version_ids, count, difficulty, model_id, acknowledge_possible_duplicate_execution } → { job }
export const createQuestionSet = (body) => api.post('/question-sets', body).then(unwrap)
export const getQuestionSet = (setId) => api.get(`/question-sets/${setId}`).then(unwrap)
// 내가 만든 문제 세트 목록 (params: { task_id, cursor, limit })
export const listQuestionSets = (params) => api.get('/question-sets', { params }).then(unwrapList)
// 한 문제의 풀이 기록
export const listQuestionAttempts = (questionId, params) =>
  api.get(`/questions/${questionId}/attempts`, { params }).then(unwrapList)
// body: { answer: { type: 'multiple_choice', selected_option_ids } | { type: 'short_answer', text }, question_set_id, model_id } → { job }
export const submitAttempt = (questionId, body) =>
  api.post(`/questions/${questionId}/attempts`, body).then(unwrap)
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`).then(unwrap)

/* ── 자습 설명 ────────────────────────────────── */
export const listLearningExplanations = (conceptVersionId) =>
  api
    .get('/learning-explanations', { params: { concept_version_id: conceptVersionId } })
    .then(unwrapList)
// body: { concept_version_id, explanation_language, model_id } → { job } (job.resource_id = 설명 ID)
export const createLearningExplanation = (body) =>
  api.post('/learning-explanations', body).then(unwrap)
export const getLearningExplanation = (id) => api.get(`/learning-explanations/${id}`).then(unwrap)

/* ── Teach-back ──────────────────────────────── */
// body: { concept_version_id, task_id, attempt_id, previous_session_id, explanation_language, student_persona }
export const createTeachbackSession = (body) => api.post('/teachback-sessions', body).then(unwrap)
export const getTeachbackSession = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}`).then(unwrap)
// 설명 중단 (active · 진행 중 job 없음일 때) · 대화와 기록은 남아요
export const abandonTeachbackSession = (sessionId) =>
  api.patch(`/teachback-sessions/${sessionId}`, { status: 'abandoned' }).then(unwrap)
export const listTeachbackMessages = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}/messages`, { params: { limit: 100 } }).then(unwrapList)
// inputMode: 'text' | 'voice_transcript' (음성은 받아쓴 텍스트를 보내요) · model_id 필수
export const sendTeachbackMessage = (sessionId, content, inputMode = 'text', modelId) =>
  api
    .post(`/teachback-sessions/${sessionId}/messages`, {
      content,
      input_mode: inputMode,
      model_id: modelId,
    })
    .then(unwrap)
// AI 질문 3회를 다 받은 뒤 마지막 답변은 이걸로 제출 (AI 추가 질문 없음)
export const submitFinalTeachbackAnswer = (sessionId, content, inputMode = 'text') =>
  api
    .post(`/teachback-sessions/${sessionId}/final-answer`, { content, input_mode: inputMode })
    .then(unwrap)
export const completeTeachbackSession = (sessionId, modelId) =>
  api.post(`/teachback-sessions/${sessionId}/complete`, { model_id: modelId }).then(unwrap)
export const getTeachbackReport = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}/report`).then(unwrap)
// body: { report_item_id, reason: incorrect|unsupported|unclear|other, comment }
export const reportTeachbackFeedback = (sessionId, body) =>
  api.post(`/teachback-sessions/${sessionId}/feedback`, body).then(unwrap)

/* ── 기록 ─────────────────────────────────────── */
export const listWeaknesses = () => api.get('/records/weaknesses').then(unwrapList)
export const listSessionRecords = () => api.get('/records/sessions').then(unwrapList)
export const listImprovementActions = (params) =>
  api.get('/records/actions', { params }).then(unwrapList)
// body: { status: pending|attempted|completed, followup_session_id } (둘 다 필수)
export const updateImprovementAction = (actionId, body) =>
  api.patch(`/records/actions/${actionId}`, body).then(unwrap)
