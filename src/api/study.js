import axios from 'axios'
import { api, unwrap, unwrapList } from './client'

/* ── 사용자 · 시험 목표 ───────────────────────── */
export const getMe = () => api.get('/me').then(unwrap)
export const listExamGoals = (params) => api.get('/exam-goals', { params }).then(unwrapList)
// body: { title, exam_type: school_exam|toeic|toefl|entrance_exam|other, exam_date: 'YYYY-MM-DD' }
export const createExamGoal = (body) => api.post('/exam-goals', body).then(unwrap)
export const updateExamGoal = (goalId, body) =>
  api.patch(`/exam-goals/${goalId}`, body).then(unwrap)

/* ── 자료 ─────────────────────────────────────── */
// 1) 업로드 URL 발급 → { material, upload_url, expires_at }
export const createMaterialUpload = (file) =>
  api
    .post('/materials', { filename: file.name, mime_type: file.type, size_bytes: file.size })
    .then(unwrap)
// 2) 발급받은 서명 URL 로 파일 직접 업로드 (우리 서버가 아니므로 토큰 없이 axios 기본 인스턴스 사용)
export const putFileToSignedUrl = (url, file) =>
  axios.put(url, file, { headers: { 'Content-Type': file.type } })
// 3) 업로드 완료 알리고 분석 시작 → { job }
export const completeMaterialUpload = (materialId) =>
  api.post(`/materials/${materialId}/complete`, {}).then(unwrap)

export const listMaterials = (params) => api.get('/materials', { params }).then(unwrapList)
export const getMaterial = (materialId) => api.get(`/materials/${materialId}`).then(unwrap)
export const deleteMaterial = (materialId) => api.delete(`/materials/${materialId}`)
export const archiveMaterial = (materialId, archived) =>
  api.patch(`/materials/${materialId}`, { archived }).then(unwrap)
export const getMaterialSource = (materialId, page = 1) =>
  api.get(`/materials/${materialId}/source`, { params: { page } }).then(unwrap)

/* ── 단원 · 개념 ──────────────────────────────── */
export const listUnits = (materialId) => api.get(`/materials/${materialId}/units`).then(unwrap)
export const listConcepts = (materialId) =>
  api.get(`/materials/${materialId}/concepts`).then(unwrap)
// body: { concepts: [{ concept_id, unit_id, base_version_id, name, summary, checklist_items, evidence_chunk_ids }] }
export const confirmConcepts = (materialId, concepts) =>
  api.patch(`/materials/${materialId}/concepts`, { concepts }).then(unwrap)

/* ── 계획 · 오늘 ──────────────────────────────── */
export const createStudyPlan = (body) => api.post('/study-plans', body).then(unwrap)
export const listStudyPlans = (params) => api.get('/study-plans', { params }).then(unwrapList)
export const getStudyPlan = (planId) => api.get(`/study-plans/${planId}`).then(unwrap)
export const rescheduleStudyPlan = (planId) =>
  api.post(`/study-plans/${planId}/reschedule`, {}).then(unwrap)
export const getToday = (params) => api.get('/today', { params }).then(unwrap)

/* ── 문제 ─────────────────────────────────────── */
// body: { unit_id, task_id, concept_version_ids, count, difficulty, acknowledge_possible_duplicate_cost } → { job }
export const createQuestionSet = (body) => api.post('/question-sets', body).then(unwrap)
export const getQuestionSet = (setId) => api.get(`/question-sets/${setId}`).then(unwrap)
// body: { answer: { type: 'multiple_choice', selected_option_ids } | { type: 'short_answer', text }, question_set_id } → { job }
export const submitAttempt = (questionId, body) =>
  api.post(`/questions/${questionId}/attempts`, body).then(unwrap)
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`).then(unwrap)

/* ── 자습 설명 ────────────────────────────────── */
export const listLearningExplanations = (conceptVersionId) =>
  api
    .get('/learning-explanations', { params: { concept_version_id: conceptVersionId } })
    .then(unwrapList)
export const createLearningExplanation = (body) =>
  api.post('/learning-explanations', body).then(unwrap)
export const getLearningExplanation = (id) => api.get(`/learning-explanations/${id}`).then(unwrap)

/* ── Teach-back ──────────────────────────────── */
// body: { concept_version_id, task_id, attempt_id, previous_session_id, explanation_language, student_persona }
export const createTeachbackSession = (body) => api.post('/teachback-sessions', body).then(unwrap)
export const getTeachbackSession = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}`).then(unwrap)
export const listTeachbackMessages = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}/messages`, { params: { limit: 100 } }).then(unwrapList)
export const sendTeachbackMessage = (sessionId, content) =>
  api
    .post(`/teachback-sessions/${sessionId}/messages`, { content, input_mode: 'text' })
    .then(unwrap)
// AI 질문 3회를 다 받은 뒤 마지막 답변은 이걸로 제출 (AI 추가 질문 없음)
export const submitFinalTeachbackAnswer = (sessionId, content) =>
  api
    .post(`/teachback-sessions/${sessionId}/final-answer`, { content, input_mode: 'text' })
    .then(unwrap)
export const completeTeachbackSession = (sessionId) =>
  api.post(`/teachback-sessions/${sessionId}/complete`, {}).then(unwrap)
export const getTeachbackReport = (sessionId) =>
  api.get(`/teachback-sessions/${sessionId}/report`).then(unwrap)
// body: { report_item_id, reason: incorrect|unsupported|unclear|other, comment }
export const reportTeachbackFeedback = (sessionId, body) =>
  api.post(`/teachback-sessions/${sessionId}/feedback`, body).then(unwrap)

/* ── 기록 ─────────────────────────────────────── */
export const listWeaknesses = () => api.get('/records/weaknesses').then(unwrapList)
export const listSessionRecords = () => api.get('/records/sessions').then(unwrapList)
export const updateImprovementAction = (actionId, body) =>
  api.patch(`/records/actions/${actionId}`, body).then(unwrap)
