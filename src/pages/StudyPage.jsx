import { useSearchParams } from 'react-router-dom'
import iconAlert from '@/assets/icons/alert.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card, { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import JobRecovery from '@/components/JobRecovery'
import { toast } from '@/components/Overlay'
import Screen, { BottomNote } from '@/components/Screen'
import Source from '@/components/Source'
import {
  useCreateLearningExplanation,
  useDday,
  useJob,
  useLearningExplanation,
  useTeachbackReport,
  useToday,
  useUpdatePlanTask,
} from '@/hooks/useStudyApi'

// 더미 (목 모드에서 표시)
const DUMMY = {
  eyebrow: '내 자료로 읽는 개념 · 2 / 2',
  title: '현재완료',
  main: {
    title: '과거에서 지금까지 이어져요',
    body: '현재완료는 have/has + p.p. 형태예요. 과거의 일이 현재와 연결될 때 써요. 계속·경험·완료·결과를 나타낼 수 있어요.',
    source: '토익 문법 정리.pdf p.24',
  },
  points: [
    {
      title: 'since · 시작한 시점',
      body: 'since 뒤에는 시작 시점이 와요.\nsince 2021은 ‘2021년부터’라는 뜻이에요.',
      source: '토익 문법 정리.pdf p.24',
    },
    {
      title: 'for · 이어진 기간',
      body: 'for 뒤에는 기간이 와요. for five years는 ‘5년 동안’이라는 뜻이에요.',
      source: '토익 문법 정리.pdf p.25',
    },
    {
      title: '과거 시점 부사는 주의해요',
      body: 'yesterday처럼 과거 시점이 분명한 말과는 현재완료 대신 과거시제를 써요.',
      source: '토익 문법 정리.pdf p.25',
      warn: true,
    },
  ],
  example: {
    title: 'She has worked here since 2021.',
    body: '2021년부터 지금까지 이곳에서 일해 왔다는 뜻이에요.',
    source: '토익 문법 정리.pdf p.24 · 계속 용법 예시',
  },
}

const sourceText = (e) => (e ? `${e.material_name} p.${e.page_number}` : null)

// 자습 설명(markdown) → 화면 데이터
// '## 제목' 단위로 나눠 첫 부분은 요약 카드, 나머지는 항목 · 제목에 '주의'가 있으면 경고, '예시'면 예시 카드
function toView(explanation, concept, index, total) {
  const { title, explanation_markdown: md, evidence = [] } = explanation.content
  const sections = [{ title, lines: [] }]
  for (const line of md.split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*)/)
    if (h) sections.push({ title: h[1].trim(), lines: [] })
    else if (!/^#\s/.test(line)) sections[sections.length - 1].lines.push(line)
  }
  const clean = (lines) =>
    lines
      .join('\n')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '· ')
      .trim()
  const [first, ...rest] = sections
  const items = rest.map((s, i) => ({
    title: s.title,
    body: clean(s.lines),
    source: sourceText(evidence[i + 1]),
    warn: /주의/.test(s.title),
  }))
  const example = items.find((p) => /예시|예문/.test(p.title))

  return {
    eyebrow: index >= 0 ? `내 자료로 읽는 개념 · ${index + 1} / ${total}` : '내 자료로 읽는 개념',
    title: concept.concept_name || title,
    main: { title: first.title, body: clean(first.lines), source: sourceText(evidence[0]) },
    points: items.filter((p) => p !== example),
    example: example && { title: example.title, body: example.body, source: example.source },
  }
}

// 리포트에서 다시 볼 항목 (오류 → 누락 → 부분 설명)
const WEAK_STATUS = {
  error: { label: '오류', tone: 'error' },
  omission: { label: '누락', tone: 'cool' },
  partial: { label: '부분', tone: 'secondary' },
}
const MOCK_WEAK = [
  {
    id: 'w1',
    status: 'error',
    description: '과거 시점 부사와 현재완료를 함께 쓸 수 있다고 설명했어요.',
  },
  { id: 'w2', status: 'omission', description: 'since와 for의 차이를 설명하지 않았어요.' },
  { id: 'w3', status: 'partial', description: '계속 용법 예시를 일부만 들었어요.' },
]

// 07 학습
export default function StudyPage() {
  const [params] = useSearchParams()
  const today = useToday()
  const dday = useDday()

  // 오늘 계획의 개념 중 ?concept=버전ID, 없으면 첫 개념
  const concepts = [
    ...new Map(
      (today.data?.tasks ?? []).flatMap((t) => t.concepts).map((c) => [c.concept_version_id, c]),
    ).values(),
  ]
  // 오늘 할 일에 없는 개념(예: 리포트에서 재학습)도 ?concept= 의 버전 ID 로 바로 보여 줘요
  const conceptParam = params.get('concept')
  const found = concepts.findIndex((c) => c.concept_version_id === conceptParam)
  const index = conceptParam ? found : 0
  const concept =
    concepts[index] ??
    (conceptParam ? { concept_version_id: conceptParam, concept_name: '' } : undefined)
  const explanation = useLearningExplanation(concept?.concept_version_id)
  const create = useCreateLearningExplanation()
  const ready = explanation.data?.ready
  const latest = explanation.data?.latest
  const failed = ['failed', 'outcome_unknown'].includes(latest?.status) ? latest : null
  const failedJob = useJob(failed?.latest_job_id)
  // 오늘 화면의 복습 할 일에서 들어오면 '복습 완료' (PATCH /plan-tasks/{id} · review 만 수동 완료)
  const task = today.data?.tasks.find((t) => t.id === params.get('task'))
  const reviewOpen =
    task?.task_type === 'review' && task.status !== 'completed' && task.status !== 'skipped'
  const updateTask = useUpdatePlanTask()
  // 리포트에서 '부족한 부분 재학습'으로 들어오면(?session=) 그 리포트의 부족한 항목을 함께 보여 줘요
  const fromReport = Boolean(params.get('session')) || params.get('review') === '1'
  const report = useTeachbackReport(params.get('session') ?? undefined)
  const weakItems = USE_MOCK
    ? fromReport
      ? MOCK_WEAK
      : []
    : (report.data?.items ?? []).filter((it) => WEAK_STATUS[it.status])
  const isReview = reviewOpen || fromReport
  // 문제 풀이 결과에서 '개념 다시 보기'로 왔으면 다음은 설명하기 (문제를 또 만들지 않아요)
  const fromQuiz = params.get('from') === 'quiz'

  const view = USE_MOCK
    ? DUMMY
    : ready?.content
      ? toView(ready, concept, index, concepts.length)
      : null
  const next = concepts[index + 1]

  const onCreate = () =>
    create.mutate(
      { conceptVersionId: concept.concept_version_id },
      { onError: (err) => toast(err.message) },
    )
  const onCompleteReview = () =>
    updateTask.mutate(
      { taskId: task.id, status: 'completed' },
      { onSuccess: () => toast('복습을 마쳤어요.'), onError: (err) => toast(err.message) },
    )

  const header = { title: '개념 학습', dday }
  if (!view) {
    const query = concept ? explanation : today
    const generating = latest?.status === 'generating'
    // 설명이 아직 없으면 사용자가 '설명 만들기'를 눌러야 생성해요
    if (concept && explanation.isSuccess) {
      return (
        <Screen header={header}>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm leading-[1.55] whitespace-pre-line text-sub">
              {generating
                ? '자료를 바탕으로 설명을 만들고 있어요…'
                : failed
                  ? '설명을 만들지 못했어요.'
                  : `‘${concept.concept_name || '이 개념'}’ 설명이 아직 없어요.
내 자료를 바탕으로 만들어 드릴게요.`}
            </p>
            {failed ? (
              <>
                <JobRecovery job={failedJob.data} modelId={failed.model_id} />
                <Button
                  variant="secondary"
                  className="w-auto px-6"
                  onClick={onCreate}
                  disabled={create.isPending}
                >
                  새로 만들기
                </Button>
              </>
            ) : (
              !generating && (
                <Button className="w-auto px-6" onClick={onCreate} disabled={create.isPending}>
                  {create.isPending ? '요청하고 있어요…' : '설명 만들기'}
                </Button>
              )
            )}
          </div>
        </Screen>
      )
    }
    return (
      <Screen header={header}>
        <ApiState
          query={query}
          empty={concept ? '설명을 준비하지 못했어요.' : '오늘 학습할 개념이 없어요.'}
        />
      </Screen>
    )
  }

  return (
    <Screen
      header={header}
      bottom={
        <>
          {isReview ? (
            <>
              {/* 복습 단계: 다시 읽고 '복습 완료' · 다시 설명하기와 보충 문제는 선택 */}
              <BottomNote>부족했던 부분을 다시 읽었다면 복습을 마쳐요.</BottomNote>
              {reviewOpen ? (
                <Button onClick={onCompleteReview} disabled={updateTask.isPending}>
                  복습 완료
                </Button>
              ) : (
                <Button to="/today">오늘로 돌아가기</Button>
              )}
              <div className="flex w-full gap-2">
                <Button
                  to={
                    params.get('session')
                      ? `/teach/prepare?retry=1&prev=${params.get('session')}`
                      : '/teach/prepare?retry=1'
                  }
                  variant="secondary"
                  className="flex-1 text-[15px]"
                >
                  다시 설명하기
                </Button>
                <Button to="/quiz?from=review" variant="secondary" className="flex-1 text-[15px]">
                  보충 문제 풀기
                </Button>
              </div>
            </>
          ) : fromQuiz ? (
            <>
              <BottomNote>틀린 개념을 다시 읽었다면 AI 학생에게 설명해 봐요.</BottomNote>
              <Button
                to={
                  params.get('concept')
                    ? `/teach/prepare?concept=${params.get('concept')}`
                    : '/teach/prepare'
                }
              >
                약점 설명하러 가기
              </Button>
            </>
          ) : (
            <>
              <BottomNote>읽은 내용을 바탕으로 문제를 풀어볼 차례예요.</BottomNote>
              {next && (
                <Button to={`/study?concept=${next.concept_version_id}`} variant="secondary">
                  다음 개념 · {next.concept_name}
                </Button>
              )}
              <Button to="/quiz">학습 완료 · 문제 만들기</Button>
            </>
          )}
        </>
      }
      className="gap-5"
    >
      <div className="flex flex-col gap-[6px]">
        <p className="text-[13px] leading-[1.4] font-medium text-sub">{view.eyebrow}</p>
        <h1 className="text-[28px] leading-[1.25] font-bold tracking-[-0.84px]">{view.title}</h1>
        <div className="pt-[2px]">
          <Chip tone="secondary">개념을 먼저 이해해요</Chip>
        </div>
      </div>

      {weakItems.length > 0 && (
        <Card tone="cool" className="gap-2 px-[18px]">
          <p className="text-[13px] leading-[1.4] font-bold text-primary">
            지난 설명에서 부족했던 부분
          </p>
          <ul className="flex flex-col gap-2">
            {weakItems.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <Chip tone={WEAK_STATUS[it.status].tone}>{WEAK_STATUS[it.status].label}</Chip>
                <span className="text-[13px] leading-[1.5]">{it.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card tone="gradient" className="rounded-[18px] px-5 py-[18px]">
        <p className="text-lg leading-[1.4] font-bold tracking-[-0.36px]">{view.main.title}</p>
        <p className="text-sm leading-[1.65] whitespace-pre-line">{view.main.body}</p>
        {view.main.source && <Source>{view.main.source}</Source>}
      </Card>

      {view.points.map((p, i) => (
        <div key={p.title} className="flex flex-col gap-5">
          {i > 0 && <Divider />}
          <section className="flex flex-col gap-[6px]">
            <h2
              className={`flex items-center gap-[6px] text-base leading-[1.4] font-bold tracking-[-0.16px] ${p.warn ? 'text-secondary' : ''}`}
            >
              {p.warn && <img src={iconAlert} alt="" className="size-4" />}
              {p.title}
            </h2>
            <p className="text-sm leading-[1.65] whitespace-pre-line text-sub">{p.body}</p>
            {p.source && <Source>{p.source}</Source>}
          </section>
        </div>
      ))}

      {view.example && (
        <Card tone="cool" className="gap-2 px-[18px]">
          <p className="text-[13px] leading-[1.4] font-bold text-primary">
            작은 예시로 확인해 볼까요?
          </p>
          <p className="text-[17px] leading-[1.4] font-bold tracking-[-0.17px]">
            {view.example.title}
          </p>
          <p className="text-[13px] leading-[1.55] whitespace-pre-line text-sub">
            {view.example.body}
          </p>
          {view.example.source && <Source>{view.example.source}</Source>}
        </Card>
      )}
    </Screen>
  )
}
