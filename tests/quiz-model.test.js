import test from 'node:test'
import assert from 'node:assert/strict'
import { quizResults, nextQuestionIndex, studyUrl } from '../src/utils/studyModel.js'

const question = (id, difficulty = 'medium') => ({
  id,
  question_type: 'multiple_choice',
  difficulty,
  prompt: `Question ${id}`,
  options: [{ id: 'a', text: 'A' }],
  concept_version_ids: ['v1'],
  evidence: [],
})
const attempt = (status, result = null) => ({
  id: 'attempt1',
  status,
  answer: { type: 'multiple_choice', selected_option_ids: ['a'] },
  result,
})
test('live quiz results never invent fallback answers', () => {
  assert.deepEqual(quizResults(null), [])
  assert.deepEqual(quizResults({ items: [] }), [])
})
test('unanswered, grading and failed are not wrong answers', () => {
  const set = {
    items: [
      { ordinal: 1, question: question('q1') },
      { ordinal: 2, question: question('q2'), latest_attempt: attempt('grading') },
      { ordinal: 3, question: question('q3'), latest_attempt: attempt('failed') },
    ],
  }
  assert.deepEqual(
    quizResults(set).map((x) => [x.status, x.isCorrect]),
    [
      ['unanswered', null],
      ['grading', null],
      ['failed', null],
    ],
  )
})
test('saved graded results retain answer text, evidence and authoritative ordinal', () => {
  const evidence = [
    { chunk_id: 'chunk1', material_id: 'material1', page_number: 7, excerpt: 'source' },
  ]
  const set = {
    items: [
      {
        ordinal: 3,
        question: { ...question('q3', 'hard'), question_type: 'short_answer', options: [] },
        latest_attempt: {
          id: 'attempt3',
          status: 'graded',
          answer: { type: 'short_answer', text: 'mine' },
          result: {
            is_correct: false,
            correct_answer: { type: 'short_answer', text: 'correct' },
            explanation: 'why',
            feedback: 'review',
            evidence,
          },
        },
      },
    ],
  }
  const [result] = quizResults(set)
  assert.equal(result.ordinal, 3)
  assert.equal(result.isCorrect, false)
  assert.equal(result.userText, 'mine')
  assert.equal(result.correctText, 'correct')
  assert.equal(result.attemptId, 'attempt3')
  assert.deepEqual(result.evidence, evidence)
})
test('resume follows server next_ordinal rather than treating failed attempt as complete', () => {
  const set = {
    next_ordinal: 2,
    items: [
      { ordinal: 2, question: question('q2'), latest_attempt: attempt('failed') },
      { ordinal: 1, question: question('q1'), latest_attempt: attempt('graded') },
    ],
  }
  assert.equal(nextQuestionIndex(set), 1)
})
test('quiz URLs retain server set identity across reload', () => {
  assert.equal(
    studyUrl('/quiz/result', { set: 'set-id', kind: 'advanced', task: null }),
    '/quiz/result?set=set-id&kind=advanced',
  )
})
