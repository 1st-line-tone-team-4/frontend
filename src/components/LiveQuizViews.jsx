import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ApiState from './ApiState'
import Button from './Button'
import Card from './Card'
import Chip from './Chip'
import { Input } from './Field'
import JobActionStatus from './JobActionStatus'
import Screen, { PageTitle } from './Screen'
import SourceChip from './SourceChip'
import { useLearningContext } from '@/hooks/useLearningContext'
import {
  useCreateQuestionSet,
  useDday,
  useQuestionSet,
  useSubmitAttempt,
  useWeaknesses,
} from '@/hooks/useStudyApi'
import {
  selectedQuestionIndex,
  quizResults,
  studyUrl,
  questionCountLimit,
} from '@/utils/studyModel'

const LEVEL = { easy: '하', medium: '중', hard: '상' }
const KIND = { check: '개념 확인', supplement: '보충', advanced: '심화', retry: '오답 다시 풀기' }
const statusLabel = { unanswered: '아직 풀지 않음', grading: '채점 중', failed: '채점 확인 필요' }
function Sources({ evidence = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {evidence.map((e, i) => (
        <SourceChip
          key={e.chunk_id || i}
          materialId={e.material_id}
          chunkId={e.chunk_id}
          page={e.page_number}
          excerpt={e.excerpt}
          file={e.material_name}
        />
      ))}
    </div>
  )
}

export function LiveQuizCreate({ mode = 'basic' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ctx = useLearningContext()
  const dday = useDday()
  const create = useCreateQuestionSet()
  const [unitOverride, setUnitOverride] = useState(null)
  const [requestedCount, setCount] = useState(null)
  const [removed, setRemoved] = useState([])
  const destination = useRef(null)
  const task = ctx.task?.task_type === 'solve' ? ctx.task : null
  const maxCount = questionCountLimit(task)
  const count = Math.min(requestedCount ?? (params.get('from') === 'review' ? 5 : 10), maxCount)
  const unitId = task?.concepts?.[0]?.unit_id || unitOverride || ctx.unitId
  const unit = ctx.units.data?.find((u) => u.id === unitId)
  const candidates = (ctx.concepts.data ?? []).filter(
    (c) => c.unit_id === unitId && c.current_version?.is_confirmed,
  )
  const selectedConcept = params.get('concept') || params.get('c')
  const entries = task
    ? task.concepts.map((c) => ({ id: c.concept_version_id, name: c.concept_name }))
    : candidates.map((c) => ({ id: c.current_version.id, name: c.current_version.name }))
  const versions = task
    ? task.concept_version_ids
    : entries.filter((c) => !removed.includes(c.id)).map((c) => c.id)
  const kind =
    mode === 'advanced' ? 'advanced' : params.get('from') === 'review' ? 'supplement' : 'check'
  const invalidTask = !!params.get('task') && !ctx.task && !ctx.plan.isLoading
  const invalidPinnedUnit = !!task && task.concepts.some((c) => c.unit_id !== unitId)
  const disabled =
    create.isPending ||
    create.blocked ||
    !unitId ||
    !versions.length ||
    count < 1 ||
    !!ctx.query.isError ||
    ctx.query.isLoading ||
    invalidTask ||
    invalidPinnedUnit
  useEffect(() => {
    if (create.isSuccess && create.data)
      navigate(studyUrl('/quiz/solve', { ...destination.current, set: create.data }), {
        replace: true,
      })
  }, [create.isSuccess, create.data, navigate])
  const start = () => {
    if (disabled) return
    destination.current = { kind, task: task?.id, plan: ctx.plan.data?.id }
    create.mutate({
      unit_id: unitId,
      task_id: task?.id || null,
      concept_version_ids: versions,
      count,
      difficulty: mode === 'advanced' ? 'hard' : 'medium',
    })
  }
  return (
    <Screen
      header={{ title: mode === 'advanced' ? '심화 문제' : '개념 확인', dday }}
      bottom={
        <Button disabled={disabled} onClick={start}>
          {create.isPending ? '문제를 만들고 있어요…' : 'AI 문제 만들기'}
        </Button>
      }
      className="gap-[22px]"
    >
      <PageTitle
        title={mode === 'advanced' ? '실력을 넓혀 볼까요?' : '배운 개념을 문제로 확인해요'}
        desc="내 자료와 확정한 개념을 바탕으로 만들어요."
      />
      {(ctx.query.isLoading || ctx.query.isError || !unitId) && (
        <ApiState
          query={ctx.query}
          empty="출제할 자료나 확정 개념이 없어요."
          action={{ label: '내 자료 확인', to: '/materials' }}
        />
      )}
      {invalidTask && (
        <p role="alert" className="text-sm text-error">
          이 학습 계획에서 요청한 과제를 찾지 못했어요. 오늘 학습에서 다시 선택해 주세요.
        </p>
      )}
      {invalidPinnedUnit && (
        <p role="alert" className="text-sm text-error">
          여러 단원에 걸친 과제는 현재 한 번에 출제할 수 없어요.
        </p>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold">출제 범위 · 한 단원</h2>
        {task ? (
          <div className="rounded-xl bg-primary-soft p-4">
            <Chip>계획에 연결된 문제</Chip>
            <p className="mt-2 text-sm font-bold">{unit?.title || task.concepts[0]?.unit_title}</p>
            <p className="mt-1 text-xs text-sub">과제의 고정 개념 버전으로 출제해요.</p>
          </div>
        ) : (
          <label className="flex flex-col gap-2 text-sm font-bold">
            단원
            <select
              className="rounded-xl border border-line bg-white p-3 font-normal"
              value={unitId || ''}
              onChange={(e) => {
                setUnitOverride(e.target.value)
                setRemoved([])
              }}
              disabled={create.isPending || create.blocked}
            >
              <option value="" disabled>
                단원 선택
              </option>
              {(ctx.units.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {entries.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={!!task || create.isPending || create.blocked}
              aria-pressed={versions.includes(c.id)}
              onClick={() =>
                setRemoved((list) =>
                  list.includes(c.id) ? list.filter((id) => id !== c.id) : [...list, c.id],
                )
              }
              className={`rounded-full border px-3 py-2 text-xs font-bold ${versions.includes(c.id) ? 'border-primary/30 bg-primary-soft text-primary' : 'border-line text-muted'}`}
            >
              {c.name}
              {selectedConcept === c.id ? ' · 선택한 개념' : ''}
            </button>
          ))}
        </div>
        {!entries.length && <p className="text-xs text-sub">이 단원에 확정된 개념이 없어요.</p>}
        <p className="text-xs text-muted">
          {ctx.material.data?.filename} · {versions.length}개 개념
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold">문제 수</h2>
        {task && <p className="text-xs text-sub">이 과제의 남은 목표: {maxCount}문제</p>}
        {task && maxCount === 0 && (
          <Link className="text-sm font-bold text-primary" to={ctx.url('/quiz', { task: null })}>
            과제와 별도로 더 연습하기
          </Link>
        )}
        <div className="flex items-center gap-3">
          <button
            className="size-11 rounded-xl bg-cool text-xl disabled:opacity-30"
            aria-label="문제 수 줄이기"
            disabled={count <= 1 || create.isPending || create.blocked}
            onClick={() => setCount(count - 1)}
          >
            −
          </button>
          <span className="flex-1 text-center text-[26px] font-bold">{count}문제</span>
          <button
            className="size-11 rounded-xl bg-cool text-xl disabled:opacity-30"
            aria-label="문제 수 늘리기"
            disabled={count >= maxCount || create.isPending || create.blocked}
            onClick={() => setCount(count + 1)}
          >
            +
          </button>
        </div>
        <input
          type="range"
          aria-label="문제 수"
          min="1"
          max={Math.max(1, maxCount)}
          value={count}
          disabled={create.isPending || create.blocked}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">난이도</h2>
        <div className="rounded-xl bg-primary-soft p-4 font-bold text-primary">
          {mode === 'advanced' ? '상' : '중'} 난이도
        </div>
        <p className="text-xs text-sub">
          현재는 한 단원, 한 난이도로 출제해요. 난이도 혼합과 여러 단원 출제는 지원하지 않아요.
        </p>
      </section>
      <div className="rounded-[14px] bg-cool p-4 text-sm leading-relaxed">
        <p className="font-bold">나만 보는 문제</p>
        <p className="mt-1 text-sub">
          문제 생성과 답안 채점은 AI를 호출하며 제공업체 비용이 발생할 수 있어요. 공개 공유는 아직
          지원하지 않아요.
        </p>
      </div>
      <JobActionStatus action={create} />
    </Screen>
  )
}

export function LiveQuizSolve() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dday = useDday()
  const query = useQuestionSet()
  const submit = useSubmitAttempt()
  const generation = useCreateQuestionSet()
  const [selection, setSelection] = useState(null)
  const [draft, setDraft] = useState('')
  const set = query.data
  const items = (set?.items ?? []).slice().sort((a, b) => a.ordinal - b.ordinal)
  const current = selectedQuestionIndex(set, selection)
  const item = items[current]
  const q = item?.question
  const kind = KIND[params.get('kind')] ? params.get('kind') : 'check'
  const savedAttempt =
    submit.data?.question_id === q?.id && submit.data?.question_set_id === set?.id
      ? submit.data
      : item?.latest_attempt
  const result = savedAttempt?.status === 'graded' ? savedAttempt.result : null
  const unresolved = !!savedAttempt && savedAttempt.status !== 'graded'
  const blocked = !!result || submit.isPending || submit.blocked || unresolved
  const context = {
    set: set?.id || params.get('set'),
    kind,
    task: set?.task_id || params.get('task'),
    plan: params.get('plan'),
  }
  const header = { title: `${KIND[kind]} 풀이`, dday }
  const answer = (payload) => {
    if (blocked || !q) return
    setSelection({ setId: set.id, index: current })
    submit.mutate({ questionId: q.id, questionSetId: set.id, answer: payload })
  }
  const next = () => {
    setDraft('')
    if (current < items.length - 1) setSelection({ setId: set.id, index: current + 1 })
    else navigate(studyUrl('/quiz/result', context))
  }
  if (!q)
    return (
      <Screen header={header}>
        <ApiState
          query={query}
          empty={set ? `문제 준비 상태: ${set.status}` : '만든 문제가 없어요.'}
          action={{ label: '문제 만들기', to: '/quiz' }}
        />
        {set?.job_id && (
          <Button
            variant="secondary"
            disabled={generation.isPending}
            onClick={() => generation.observeJob(set.job_id)}
          >
            기존 생성 작업 상태 확인
          </Button>
        )}
        <JobActionStatus action={generation} />
      </Screen>
    )
  const correctIds = result?.correct_answer?.selected_option_ids ?? []
  const pickedIds = savedAttempt?.answer?.selected_option_ids ?? []
  const correctText =
    q.options
      ?.filter((o) => correctIds.includes(o.id))
      .map((o) => o.text)
      .join(', ') || result?.correct_answer?.text
  return (
    <Screen
      header={header}
      bottom={
        <>
          <Button onClick={next} disabled={!result}>
            {current < items.length - 1 ? '다음 문제' : '결과 보기'}
          </Button>
          <Button variant="secondary" to={studyUrl('/quiz/result', context)}>
            전체 진행 보기
          </Button>
        </>
      }
    >
      <div className="flex gap-2">
        <Chip tone={kind === 'advanced' ? 'secondary' : 'solid'}>{KIND[kind]}</Chip>
        <Chip tone="cool">난이도 {LEVEL[q.difficulty]}</Chip>
      </div>
      <PageTitle
        title={`${item.ordinal}번 문제`}
        desc={`${q.question_type === 'multiple_choice' ? '객관식' : '주관식'} · 내 자료 기반`}
      />
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs">
          <b>
            {item.ordinal} / {items.length} 문제
          </b>
          <span>비공개</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-cool">
          <div
            className="h-full bg-primary"
            style={{ width: `${((current + 1) / items.length) * 100}%` }}
          />
        </div>
      </div>
      <Card tone="gradient" className="rounded-[18px] p-[18px]">
        <p className="whitespace-pre-line text-[21px] font-bold leading-[1.4]">{q.prompt}</p>
      </Card>
      {q.question_type === 'multiple_choice' ? (
        <ul className="flex flex-col gap-2">
          {q.options.map((option, i) => (
            <li key={option.id}>
              <button
                type="button"
                disabled={blocked}
                onClick={() =>
                  answer({ type: 'multiple_choice', selected_option_ids: [option.id] })
                }
                className={`w-full rounded-[14px] border p-4 text-left text-[15px] ${result && correctIds.includes(option.id) ? 'border-primary bg-primary-soft font-bold' : result && pickedIds.includes(option.id) ? 'border-error bg-error-soft font-bold' : 'border-line'}`}
              >
                <span className="mr-2">{i + 1}.</span>
                {option.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft.trim()) answer({ type: 'short_answer', text: draft.trim() })
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={blocked}
            placeholder="답을 입력해 주세요"
          />
          <Button
            type="submit"
            className="w-auto shrink-0 px-5"
            disabled={blocked || !draft.trim()}
          >
            제출
          </Button>
        </form>
      )}
      {unresolved && (
        <div className="flex flex-col gap-2 rounded-xl bg-cool p-4">
          <p className="text-sm">
            {statusLabel[savedAttempt.status] || '답안 처리 상태 확인이 필요해요.'} 새 답안을 보내기
            전에 기존 작업을 확인해 주세요.
          </p>
          {savedAttempt.job_id && (
            <Button
              variant="secondary"
              disabled={submit.isPending}
              onClick={() => {
                setSelection({ setId: set.id, index: current })
                submit.observeJob(savedAttempt.job_id)
              }}
            >
              기존 채점 작업 확인
            </Button>
          )}
        </div>
      )}
      <JobActionStatus action={submit} />
      {result && (
        <section className="flex flex-col gap-3 rounded-[14px] bg-cool p-4">
          <div>
            <Chip tone={result.is_correct ? 'primary' : 'error'}>
              {result.is_correct ? '정답' : '오답'}
            </Chip>
          </div>
          <p className="text-sm font-bold">정답: {correctText}</p>
          {savedAttempt.answer?.text && (
            <p className="text-xs text-sub">내 답: {savedAttempt.answer.text}</p>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {[result.feedback, result.explanation].filter(Boolean).join('\n')}
          </p>
          <Sources evidence={result.evidence} />
        </section>
      )}
      <p className="text-center text-xs text-muted">문제 신고는 아직 지원하지 않아요.</p>
    </Screen>
  )
}

export function LiveQuizResult() {
  const [params] = useSearchParams()
  const dday = useDday()
  const query = useQuestionSet()
  const weaknesses = useWeaknesses()
  const [openId, setOpenId] = useState(null)
  const set = query.data
  const answers = quizResults(set)
  const graded = answers.filter((a) => a.isCorrect !== null)
  const wrong = graded.filter((a) => !a.isCorrect)
  const correct = graded.filter((a) => a.isCorrect).length
  const remaining = answers.length - graded.length
  const kind = params.get('kind') || 'check'
  const context = {
    set: set?.id || params.get('set'),
    kind,
    task: set?.task_id || params.get('task'),
    plan: params.get('plan'),
  }
  if (!set || !answers.length)
    return (
      <Screen header={{ title: '개념 확인 결과', dday }}>
        <ApiState
          query={query}
          empty={set ? `문제 준비 상태: ${set.status}` : '조회할 문제 세트가 없어요.'}
          action={{ label: '문제 만들기', to: '/quiz' }}
        />
      </Screen>
    )
  const nameFor = (id) =>
    weaknesses.data?.find((w) => w.concept_version_id === id)?.concept_name || '출제 개념'
  const byLevel = ['하', '중', '상'].map((level) => {
    const list = graded.filter((a) => a.level === level)
    return {
      level,
      total: list.length,
      rate: list.length
        ? Math.round((list.filter((a) => a.isCorrect).length / list.length) * 100)
        : null,
    }
  })
  return (
    <Screen
      header={{ title: kind === 'advanced' ? '심화 문제 결과' : '개념 확인 결과', dday }}
      bottom={
        <>
          {remaining > 0 && (
            <Button to={studyUrl('/quiz/solve', context)}>남은 문제 이어가기</Button>
          )}
          <Button
            variant={remaining ? 'secondary' : 'primary'}
            to={
              wrong[0]
                ? studyUrl('/teach/prepare', {
                    concept: wrong[0].conceptVersionId,
                    attempt: wrong[0].attemptId,
                  })
                : '/teach/prepare'
            }
          >
            개념 설명하러 가기
          </Button>
          <Button variant="secondary" to="/today">
            오늘 학습으로
          </Button>
        </>
      }
      className="gap-6"
    >
      <PageTitle
        title={`채점한 ${graded.length}문제 중 ${correct}문제 맞혔어요`}
        desc={
          remaining
            ? `전체 ${answers.length}문제 중 ${remaining}문제는 아직 채점이 끝나지 않았어요.`
            : '저장된 답안과 채점 결과를 바탕으로 보여 드려요.'
        }
      />
      <div className="grid grid-cols-3 gap-2">
        {byLevel.map(({ level, total, rate }) => (
          <div key={level} className="flex flex-col items-center gap-1 rounded-2xl bg-cool py-3">
            <span className="text-xs font-bold text-sub">난이도 {level}</span>
            <span className="text-xl font-bold">{rate === null ? '-' : `${rate}%`}</span>
            <span className="text-[11px] text-muted">채점 {total}문제</span>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">다시 설명할 개념</h2>
        {wrong.length ? (
          <ul className="flex flex-col gap-2">
            {wrong.map((a) => (
              <li key={a.questionId}>
                <Link
                  to={studyUrl('/teach/prepare', {
                    concept: a.conceptVersionId,
                    attempt: a.attemptId,
                  })}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line p-4"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {a.ordinal}번 · {nameFor(a.conceptVersionId)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-sub">{a.sentence}</p>
                  </div>
                  <Chip tone="error">오답</Chip>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-primary-soft p-4 text-sm text-primary">
            {graded.length
              ? '채점이 끝난 답안에는 오답이 없어요.'
              : '아직 채점이 끝난 답안이 없어요.'}
          </p>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">문제별 결과</h2>
        <ul className="divide-y divide-line">
          {answers.map((a) => {
            const open = openId === a.questionId
            const chosen = a.choices.find((c) => c.id === a.pickedId)?.text || a.userText
            const right = a.choices.find((c) => c.id === a.answerId)?.text || a.correctText
            return (
              <li key={a.questionId}>
                <button
                  className="flex w-full items-center gap-3 py-4 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : a.questionId)}
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a.isCorrect === null ? 'bg-cool text-muted' : a.isCorrect ? 'bg-primary-soft text-primary' : 'bg-error-soft text-error'}`}
                  >
                    {a.isCorrect === null ? '…' : a.isCorrect ? 'O' : 'X'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {a.ordinal}. {a.sentence}
                    </p>
                    <p className="mt-1 text-xs text-sub">
                      난이도 {a.level} ·{' '}
                      {a.isCorrect === null
                        ? statusLabel[a.status] || a.status
                        : a.isCorrect
                          ? '정답'
                          : '오답'}
                    </p>
                  </div>
                  <span>⌄</span>
                </button>
                {open && (
                  <div className="mb-3 flex flex-col gap-2 rounded-xl bg-cool p-4 text-sm">
                    {chosen && <p>내 답: {chosen}</p>}
                    {right && <p className="font-bold">정답: {right}</p>}
                    {a.explanation && (
                      <p className="whitespace-pre-line leading-relaxed">{a.explanation}</p>
                    )}
                    <Sources evidence={a.evidence} />
                    {a.isCorrect === null && (
                      <Link
                        className="font-bold text-primary"
                        to={studyUrl('/quiz/solve', context)}
                      >
                        풀이에서 작업 상태 확인
                      </Link>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <p className="text-xs text-muted">
        미응답과 채점 실패는 오답률에 포함하지 않아요. 문제 신고는 아직 지원하지 않아요.
      </p>
      {query.isFetching && <p className="text-xs text-muted">저장된 결과를 갱신하고 있어요…</p>}
    </Screen>
  )
}
