import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from './Button'
import Chip from './Chip'
import Screen, { PageTitle } from './Screen'
import ApiState from './ApiState'
import SourceViewer from './SourceViewer'
import SourceChip from './SourceChip'
import JobActionStatus from './JobActionStatus'
import { useLearningContext } from '@/hooks/useLearningContext'
import {
  useDday,
  useGenerateExplanation,
  useLearningExplanation,
  useTeachbackReport,
  useTeachbackSession,
  useUpdatePlanTask,
  useStudyPlan,
} from '@/hooks/useStudyApi'
import { studyUrl } from '@/utils/studyModel'

function EvidenceLinks({ evidence = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {evidence.map((e, i) => (
        <SourceChip
          key={e.chunk_id || i}
          materialId={e.material_id}
          page={e.page_number}
          excerpt={e.excerpt}
          chunkId={e.chunk_id}
          file={e.material_name}
        />
      ))}
    </div>
  )
}
export function LiveUnitView() {
  const ctx = useLearningContext()
  const dday = useDday()
  if (!ctx.contextReady || !ctx.selected)
    return (
      <Screen header={{ title: '단원 개념 정리', dday }}>
        <ApiState
          query={ctx.query}
          empty="확정한 개념이 없어요. 자료와 개념을 먼저 확인해 주세요."
          action={{ label: '내 자료', to: '/materials' }}
        />
      </Screen>
    )
  return (
    <Screen
      header={{ title: '단원 개념 정리', dday }}
      bottom={
        <>
          <Button to={ctx.url('/learn', { concept: ctx.selected.current_version.id })}>
            이어서 배우기 · {ctx.selected.current_version.name}
          </Button>
          <Button to={ctx.url('/quiz')} variant="secondary">
            이 단원 개념 확인하기
          </Button>
        </>
      }
      className="gap-5"
    >
      <div className="flex flex-col gap-2 rounded-[18px] bg-[linear-gradient(144deg,var(--color-logo-blue)_0%,var(--color-primary)_74%)] p-5 text-white">
        <p className="text-xs">내 자료로 배우는 개념</p>
        <h1 className="text-[22px] font-bold">{ctx.unit?.title}</h1>
        <p className="text-sm">{ctx.material.data?.filename}</p>
        <span className="text-xs">확정 개념 {ctx.list.length}개</span>
      </div>
      {ctx.units.data?.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {ctx.units.data.map((unit) => (
            <Link key={unit.id} to={ctx.url('/unit', { unit: unit.id, task: null })}>
              <Chip tone={unit.id === ctx.unitId ? 'solid' : 'cool'}>{unit.title}</Chip>
            </Link>
          ))}
        </div>
      )}
      <p className="text-sm text-sub">
        자료에서 확인한 개념을 읽고 문제와 설명으로 연습해요. 읽기 진행률은 아직 별도로 저장하지
        않아요.
      </p>
      <ul className="divide-y divide-line">
        {ctx.list.map((concept, index) => (
          <li key={concept.concept_id} className="py-4">
            <Link
              to={ctx.url('/learn', { concept: concept.current_version.id })}
              className="flex gap-3"
            >
              <span className="text-primary font-bold">{index + 1}</span>
              <div className="flex-1">
                <p className="font-bold">{concept.current_version.name}</p>
                <p className="mt-1 text-sm text-sub">{concept.current_version.summary}</p>
                <p className="mt-2 text-xs text-muted">
                  확인 항목 {concept.current_version.checklist_items?.length ?? 0}개
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  )
}

export function LiveLearnView() {
  const ctx = useLearningContext()
  const dday = useDday()
  const concept = ctx.selected?.current_version
  const explanation = useLearningExplanation(concept?.id)
  const generate = useGenerateExplanation()
  const [pageIndex, setPageIndex] = useState(0)
  const [pct, setPct] = useState(40)
  const evidence = explanation.data?.content?.evidence ?? concept?.evidence ?? []
  const source = evidence[pageIndex] ?? evidence[0]
  const index = ctx.list.findIndex((c) => c.current_version.id === concept?.id)
  if (!ctx.contextReady || !concept)
    return (
      <Screen header={{ title: '개념 설명', dday }}>
        <ApiState
          query={ctx.query}
          empty="학습할 개념이 없어요."
          action={{ label: '내 자료', to: '/materials' }}
        />
      </Screen>
    )
  const content = explanation.data?.content
  const generationExists = !!explanation.data && explanation.data.status !== 'ready'
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-cool md:max-w-[1024px]">
      <header className="flex h-12 shrink-0 items-center justify-between bg-white px-4">
        <Link to={ctx.url('/unit')} className="font-bold">
          ‹ 개념 설명
        </Link>
        <div className="flex gap-2">
          <Chip tone="cool">
            {index + 1} / {ctx.list.length}
          </Chip>
          {dday && <Chip>{dday}</Chip>}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section
          className="overflow-y-auto px-4 py-3 md:!h-auto md:flex-1"
          style={{ height: `${pct}%` }}
        >
          <div className="mb-2 flex items-center justify-between text-xs text-sub">
            <span>
              {ctx.material.data?.filename}
              {source?.page_number ? ` · p.${source.page_number}` : ''}
            </span>
            {source && (
              <Link
                to={studyUrl('/source', {
                  materialId: source.material_id || ctx.materialId,
                  page: source.page_number,
                })}
              >
                전체 화면 ↗
              </Link>
            )}
          </div>
          {source ? (
            <SourceViewer
              materialId={source.material_id || ctx.materialId}
              page={source.page_number || 1}
              excerpt={source.excerpt}
            />
          ) : (
            <p className="rounded-xl bg-white p-5 text-sm">이 개념에 연결된 원문 근거가 없어요.</p>
          )}
          {evidence.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {evidence.map((e, i) => (
                <button
                  key={e.chunk_id || i}
                  onClick={() => setPageIndex(i)}
                  className="rounded-lg bg-white px-3 py-2 text-xs"
                >
                  근거 {i + 1}
                  {e.page_number ? ` · p.${e.page_number}` : ''}
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="flex min-h-0 flex-1 flex-col rounded-t-[24px] bg-white md:max-w-[480px] md:rounded-none md:border-l md:border-line">
          <label className="px-6 pt-2 text-[11px] text-muted md:hidden">
            자료 영역 크기
            <input
              className="w-full"
              type="range"
              min="20"
              max="65"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
            />
          </label>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <div>
              <p className="text-xs font-bold text-primary">{ctx.unit?.title}</p>
              <h1 className="mt-1 text-[22px] font-bold">{concept.name}</h1>
            </div>
            <section className="flex flex-col gap-2">
              <p className="text-[13px] font-bold text-sub">① 핵심 개념</p>
              <p className="text-sm leading-[1.65] whitespace-pre-line">{concept.summary}</p>
            </section>
            <section className="flex flex-col gap-2">
              <p className="text-[13px] font-bold text-sub">② 확인할 항목</p>
              <ul className="flex flex-col gap-2">
                {(concept.checklist_items ?? []).map((item, i) => (
                  <li key={item.id || i} className="rounded-xl bg-cool px-4 py-3 text-sm">
                    {typeof item === 'string'
                      ? item
                      : (item.criterion ?? item.text ?? item.description)}
                  </li>
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-3">
              <p className="text-[13px] font-bold text-sub">③ 자료를 바탕으로 한 자습 설명</p>
              {explanation.isError && (
                <p role="alert" className="text-sm text-error">
                  {explanation.error.message}
                </p>
              )}
              {explanation.isLoading ? (
                <p>저장된 설명을 확인하고 있어요…</p>
              ) : content ? (
                <>
                  <h2 className="text-base font-bold">{content.title}</h2>
                  <p className="whitespace-pre-line text-sm leading-[1.65]">
                    {content.explanation_markdown}
                  </p>
                  <EvidenceLinks evidence={content.evidence} />
                </>
              ) : (
                <>
                  <p className="text-sm text-sub">
                    {generationExists
                      ? `이전 설명 작업: ${explanation.data.status}. 새 작업을 만들기 전에 상태를 확인해 주세요.`
                      : '설명 생성은 AI를 호출하며 제공업체 비용이 발생할 수 있어요. 저장된 요약과 근거는 생성 없이 읽을 수 있어요.'}
                  </p>
                  {!generationExists && !explanation.isError && (
                    <Button
                      disabled={generate.isPending || generate.blocked}
                      onClick={() =>
                        generate.mutate({
                          concept_version_id: concept.id,
                          explanation_language: 'ko',
                        })
                      }
                    >
                      AI 자습 설명 생성
                    </Button>
                  )}
                  {generationExists && explanation.data.latest_job_id && (
                    <Button
                      variant="secondary"
                      disabled={generate.isPending}
                      onClick={() => generate.observeJob(explanation.data.latest_job_id)}
                    >
                      기존 작업 상태 확인
                    </Button>
                  )}
                </>
              )}
              <JobActionStatus action={generate} />
            </section>
          </div>
          <div className="flex gap-2 border-t border-line px-6 py-4">
            {index > 0 && (
              <Button
                variant="secondary"
                to={ctx.url('/learn', { concept: ctx.list[index - 1].current_version.id })}
              >
                이전 개념
              </Button>
            )}
            {index < ctx.list.length - 1 ? (
              <Button to={ctx.url('/learn', { concept: ctx.list[index + 1].current_version.id })}>
                다음 개념
              </Button>
            ) : (
              <Button to={ctx.url('/quiz')}>문제로 확인하기</Button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export function LiveReviewView() {
  const [params] = useSearchParams()
  const dday = useDday()
  const session = useTeachbackSession(params.get('session') || null)
  const report = useTeachbackReport(params.get('session') || null)
  const plan = useStudyPlan()
  const update = useUpdatePlanTask()
  const task =
    plan.data?.tasks.find((t) => t.id === params.get('task') && t.task_type === 'review') ||
    plan.data?.tasks.find(
      (t) =>
        t.task_type === 'review' &&
        t.concept_version_ids.includes(report.data?.concept_version_id) &&
        t.status !== 'completed',
    )
  const concept = task?.concepts?.[0]
  const matching =
    !report.data || !task || task.concept_version_ids.includes(report.data.concept_version_id)
  const items = matching
    ? (report.data?.items.filter((item) => item.status !== 'explained') ?? [])
    : []
  const learnLink = studyUrl('/learn', {
    material: concept?.material_id,
    unit: concept?.unit_id,
    concept: concept?.concept_version_id || report.data?.concept_version_id,
    task: task?.id,
    plan: plan.data?.id,
  })
  return (
    <Screen
      header={{ title: '부족한 부분 재학습', dday }}
      bottom={
        <>
          <Button to={learnLink}>자료에서 개념 다시 보기</Button>
          {session.data && matching && (
            <Button
              variant="secondary"
              to={studyUrl('/teach/prepare', { retry: 1, prev: session.data.id })}
            >
              같은 개념 다시 설명하기
            </Button>
          )}
          {task && (
            <Button
              disabled={update.isPending || task.status === 'completed'}
              variant="secondary"
              onClick={() => update.mutate({ taskId: task.id, status: 'completed' })}
            >
              {task.status === 'completed' ? '복습 완료됨' : '복습 완료로 표시'}
            </Button>
          )}
        </>
      }
      className="gap-5"
    >
      <PageTitle
        title={concept?.concept_name || '설명에서 놓친 부분을 살펴봐요'}
        desc="실제 리포트와 자료 근거로 복습해요."
      />
      {(session.isError || report.isError || plan.isError) && (
        <ApiState query={session.isError ? session : report.isError ? report : plan} />
      )}
      {!params.get('session') && (
        <p className="rounded-xl bg-cool p-4 text-sm">
          연결된 리포트를 선택하지 않았어요. 개념 자료로 복습하거나 기록에서 설명 리포트를 열어
          주세요.
        </p>
      )}
      {!matching && <p role="alert">이 리포트는 선택한 복습 과제의 개념과 달라요.</p>}
      {items.map((item) => (
        <section
          key={item.id}
          className="flex flex-col gap-3 rounded-[18px] border border-line p-5"
        >
          <Chip tone={item.status === 'error' ? 'error' : 'cool'}>
            {
              {
                partial: '부분 설명',
                omission: '누락',
                error: '오류',
                unverified: '근거 확인 불가',
              }[item.status]
            }
          </Chip>
          <p className="text-sm leading-[1.65]">{item.description}</p>
          <EvidenceLinks evidence={item.evidence} />
        </section>
      ))}
      {matching && report.data && !items.length && (
        <p className="rounded-xl bg-primary-soft p-4 text-sm">
          이번 리포트에 부족한 항목이 없어요. 자료를 다시 확인할 수 있어요.
        </p>
      )}
      <JobActionStatus action={update} />
    </Screen>
  )
}
