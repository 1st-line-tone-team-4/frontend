import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import iconMessage from '@/assets/icons/message.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { MicIcon } from '@/components/icons'
import Logo from '@/components/Logo'
import { Modal, toast } from '@/components/Overlay'
import Screen, { PageTitle } from '@/components/Screen'
import { WEAKNESSES } from '@/data/flow'
import { getMicPermission, requestMicStream, speechSupport, stopStream } from '@/hooks/useSpeech'
import { getTeachbackSession } from '@/api/study'
import { useCreateTeachbackSession, useDday, useToday, useWeaknesses } from '@/hooks/useStudyApi'

// 약점 개념 우선, 그다음 오늘 계획의 개념 (중복 제거)
function toConcepts(weaknesses = [], tasks = []) {
  const list = [
    ...weaknesses.map((w) => ({
      name: w.concept_name,
      versionId: w.concept_version_id,
      wrong: w.incorrect_attempts,
    })),
    ...tasks
      .flatMap((t) => t.concepts)
      .map((c) => ({ name: c.concept_name, versionId: c.concept_version_id })),
  ]
  return [...new Map(list.map((c) => [c.versionId, c])).values()]
}

const RULES = [
  '설명 중간에도 질문할 수 있어요',
  '정답을 먼저 알려주거나 설명을 대신 완성하지 않아요',
  '민지는 최대 3번 질문해요. 마지막 질문에 답하면 설명이 끝나요',
  '설명은 개념 하나씩 해요. 다른 개념은 오늘 할 일에서 이어서 설명해요',
]

// 10 설명 준비 (수정본) · 언어는 한국어 고정, 학생은 1명
export default function TeachPreparePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dday = useDday()
  const weaknesses = useWeaknesses()
  const today = useToday()
  const create = useCreateTeachbackSession()

  /**
   * 세션은 개념 버전 1개로 만들어요 (POST /teachback-sessions 의 concept_version_id)
   * - ?task=  오늘 할 일(teach_back)의 개념으로 고정 · task_id 연결
   * - ?prev=  다시 설명하기 → 지난 세션과 같은 개념으로 고정
   * - ?concept= 그 개념으로 고정
   * - 그 외   약점 · 오늘 개념 중 하나를 골라요
   */
  const prevId = params.get('prev')
  const prev = useQuery({
    queryKey: ['session', prevId],
    queryFn: () => getTeachbackSession(prevId),
    enabled: !USE_MOCK && !!prevId,
  })
  const task = today.data?.tasks.find(
    (t) => t.id === params.get('task') && t.task_type === 'teach_back',
  )
  const candidates = USE_MOCK
    ? WEAKNESSES.map((w) => ({ name: w.name, wrong: w.wrong, versionId: w.id }))
    : toConcepts(weaknesses.data, today.data?.tasks)
  const findConcept = (versionId) =>
    versionId && {
      name: '',
      ...today.data?.tasks
        .flatMap((t) => t.concepts)
        .map((c) => ({ name: c.concept_name, versionId: c.concept_version_id }))
        .find((c) => c.versionId === versionId),
      ...candidates.find((c) => c.versionId === versionId),
      versionId,
    }
  const fixedVersionId =
    task?.concept_version_ids?.[0] ?? prev.data?.concept_version_id ?? params.get('concept')
  const fixed = findConcept(fixedVersionId)
  const [pickedId, setPickedId] = useState(null)
  const [askMic, setAskMic] = useState(false)
  const [checking, setChecking] = useState(false)
  const concept = fixed || candidates.find((c) => c.versionId === pickedId) || candidates[0]
  const waitingFixed = (!!params.get('task') && today.isLoading) || (!!prevId && prev.isLoading)

  const go = () => {
    const chatState = {
      conceptName: concept?.name ?? '현재완료',
      weak: concept ? [concept.name] : [],
    }
    const url = params.get('retry') ? '/teach?retry=1' : '/teach'
    if (USE_MOCK) return navigate(url, { state: chatState })
    if (!concept) return toast('설명할 개념이 없어요. 개념 확인과 학습 계획을 먼저 만들어 주세요.')
    create.mutate(
      {
        concept_version_id: concept.versionId,
        task_id: task?.concept_version_ids?.includes(concept.versionId) ? task.id : null,
        attempt_id: params.get('attempt'),
        previous_session_id: params.get('prev'),
        explanation_language: 'ko',
        student_persona: 'curious_beginner',
      },
      {
        onSuccess: () => navigate(url, { state: chatState }),
        onError: (err) => toast(err.message),
      },
    )
  }

  // 처음 쓸 때는 마이크 권한 요청을 먼저 띄워요
  const onStart = async () => {
    if (!speechSupport.media) return go()
    setChecking(true)
    const state = await getMicPermission()
    setChecking(false)
    if (state === 'granted' || state === 'denied') {
      if (state === 'denied')
        toast('글로 설명할 수 있어요. 설정에서 마이크를 켜면 말로도 설명할 수 있어요.')
      return go()
    }
    setAskMic(true)
  }

  const allowMic = async () => {
    setAskMic(false)
    try {
      stopStream(await requestMicStream())
    } catch (err) {
      toast(err.message)
    }
    go()
  }

  return (
    <Screen
      header={{ title: '설명 준비', dday }}
      bottom={
        <Button
          onClick={onStart}
          disabled={create.isPending || checking || waitingFixed || !concept}
        >
          {create.isPending ? '설명을 준비하고 있어요…' : '설명 시작하기'}
        </Button>
      }
      className="gap-[22px]"
    >
      <PageTitle
        title="이번엔 내가 선생님이에요"
        desc="개념 확인 퀴즈에서 틀린 부분을 AI 학생에게 설명해 주세요."
      />

      {/* 설명할 개념 1개 · 할 일 · 다시 설명 · 지정 개념이면 고정, 아니면 하나 골라요 */}
      <section className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">설명할 개념</p>
          {!fixed && candidates.length > 1 && (
            <p className="text-xs text-muted">하나를 골라 주세요</p>
          )}
        </div>
        {waitingFixed ? (
          <p className="text-sm text-muted">불러오는 중이에요…</p>
        ) : fixed ? (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-primary/30 bg-primary-soft px-4 py-3">
            <p className="text-[15px] leading-[1.4] font-bold text-primary">
              {fixed.name || '선택한 개념'}
            </p>
            {fixed.wrong ? <Chip tone="white">틀림 {fixed.wrong}</Chip> : null}
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-sub">
            설명할 개념이 없어요. 개념 확인과 학습 계획을 먼저 만들어 주세요.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2" role="radiogroup" aria-label="설명할 개념">
            {candidates.map((c) => {
              const on = c.versionId === concept?.versionId
              return (
                <li key={c.versionId}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPickedId(c.versionId)}
                    className={`flex items-center gap-[6px] rounded-full border-[1.5px] px-[14px] py-[7px] text-left text-sm ${
                      on
                        ? 'border-primary bg-primary-soft font-bold text-primary'
                        : 'border-line bg-white font-medium text-sub'
                    }`}
                  >
                    {c.name}
                    {c.wrong ? (
                      <span className="text-xs font-medium opacity-70">틀림 {c.wrong}</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 학생 소개 */}
      <section className="flex flex-col gap-3 rounded-[18px] bg-[linear-gradient(159deg,var(--color-primary-soft)_0%,var(--color-secondary-soft)_74%)] p-[18px]">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-white">
            <Logo variant="mascot" />
          </span>
          <div className="flex flex-col leading-[1.4]">
            <p className="text-[17px] font-bold tracking-[-0.17px]">민지</p>
            <p className="text-xs text-sub">AI 학생 · 한국어로 대화해요</p>
          </div>
        </div>
        <p className="text-[15px] leading-[1.55] font-medium">
          “처음 배우는 학생이에요. 쉬운 말로 설명해 주세요.”
        </p>
        <p className="rounded-xl bg-white/70 px-[14px] py-[10px] text-[13px] leading-[1.55] text-sub">
          질문은 날카롭고 어려워요. 개념 확인 퀴즈에서 틀린 부분을 집중해서 물어봐요.
        </p>
      </section>

      {/* 진행 규칙 */}
      <section className="flex flex-col gap-[10px] rounded-[14px] bg-cool px-4 py-[14px]">
        <p className="flex items-center gap-2 text-sm leading-[1.4] font-bold">
          <img src={iconMessage} alt="" className="size-[18px]" />
          이렇게 진행돼요
        </p>
        <ul className="flex flex-col gap-[6px] pl-[26px]">
          {RULES.map((r) => (
            <li key={r} className="list-disc text-[13px] leading-[1.55] text-sub">
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-start gap-3 rounded-[14px] border border-line px-4 py-[14px]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MicIcon size={18} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-[1.4] font-bold">말로 설명하거나 글로 써도 돼요</p>
          <p className="text-[13px] leading-[1.55] text-sub">
            중간에 바꿀 수 있어요. 음성 대화 모드에서는 말을 멈추면 민지가 바로 질문해요.
          </p>
        </div>
        <Chip tone="secondary" className="ml-auto">
          음성
        </Chip>
      </section>

      <Modal
        open={askMic}
        title="마이크를 사용할까요?"
        desc={'말로 설명하려면 마이크 권한이 필요해요.\n허용하지 않아도 글로 설명할 수 있어요.'}
        confirmLabel="허용하기"
        cancelLabel="글로만 할게요"
        onConfirm={allowMic}
        onClose={() => {
          setAskMic(false)
          go()
        }}
      />
    </Screen>
  )
}
