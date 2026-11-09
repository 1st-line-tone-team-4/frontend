import { useSearchParams } from 'react-router-dom'
import iconAlert from '@/assets/icons/alert.svg'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Card, { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen, { BottomNote } from '@/components/Screen'
import Source from '@/components/Source'
import { useDday, useLearningExplanation, useToday } from '@/hooks/useStudyApi'

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
    eyebrow: `내 자료로 읽는 개념 · ${index + 1} / ${total}`,
    title: concept.concept_name,
    main: { title: first.title, body: clean(first.lines), source: sourceText(evidence[0]) },
    points: items.filter((p) => p !== example),
    example: example && { title: example.title, body: example.body, source: example.source },
  }
}

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
  const index = Math.max(
    concepts.findIndex((c) => c.concept_version_id === params.get('concept')),
    0,
  )
  const concept = concepts[index]
  const explanation = useLearningExplanation(concept?.concept_version_id)

  const view = USE_MOCK
    ? DUMMY
    : explanation.data?.content
      ? toView(explanation.data, concept, index, concepts.length)
      : null
  const next = concepts[index + 1]

  const header = { title: '개념 학습', dday }
  if (!view) {
    const query = concept ? explanation : today
    return (
      <Screen header={header}>
        <ApiState
          query={query.isLoading && concept ? { isLoading: true } : query}
          empty={concept ? '설명을 준비하지 못했어요.' : '오늘 학습할 개념이 없어요.'}
        />
        {concept && explanation.isLoading && (
          <p className="text-center text-xs text-muted">자료를 바탕으로 설명을 만들고 있어요</p>
        )}
      </Screen>
    )
  }

  return (
    <Screen
      header={header}
      bottom={
        <>
          <BottomNote>읽은 내용을 바탕으로 문제를 풀어볼 차례예요.</BottomNote>
          {next && (
            <Button to={`/study?concept=${next.concept_version_id}`} variant="secondary">
              다음 개념 · {next.concept_name}
            </Button>
          )}
          <Button to="/quiz">학습 완료 · 문제 만들기</Button>
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
