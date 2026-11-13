import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import iconMessage from '@/assets/icons/message.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { MicIcon, XIcon } from '@/components/icons'
import Logo from '@/components/Logo'
import { Modal, toast } from '@/components/Overlay'
import Screen, { PageTitle } from '@/components/Screen'
import { WEAKNESSES } from '@/data/flow'
import { getMicPermission, requestMicStream, speechSupport, stopStream } from '@/hooks/useSpeech'
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
  '질문 개수에는 제한이 없어요. 설명 마치기를 누를 때까지 이어져요',
]

// 10 설명 준비 (수정본) · 언어는 한국어 고정, 학생은 1명
export default function TeachPreparePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dday = useDday()
  const weaknesses = useWeaknesses()
  const today = useToday()
  const create = useCreateTeachbackSession()

  // ?concept=버전ID 로 오면(문제 결과 → 개념 다시 보기 → 설명하기) 그 개념을 맨 앞에 둬요
  const focus = params.get('concept')
  const initial = (
    USE_MOCK
      ? WEAKNESSES.map((w) => ({ name: w.name, wrong: w.wrong, versionId: w.id }))
      : toConcepts(weaknesses.data, today.data?.tasks)
  ).sort((a, b) => (b.versionId === focus) - (a.versionId === focus))
  const [removed, setRemoved] = useState([])
  const [askMic, setAskMic] = useState(false)
  const [checking, setChecking] = useState(false)
  const list = initial.filter((c) => !removed.includes(c.versionId))
  const task = today.data?.tasks.find((t) => t.id === params.get('task'))

  const go = () => {
    const chatState = { conceptName: list[0]?.name ?? '현재완료', weak: list.map((c) => c.name) }
    const url = params.get('retry') ? '/teach?retry=1' : '/teach'
    if (USE_MOCK) return navigate(url, { state: chatState })
    const concept = list[0]
    if (!concept) return toast('설명할 개념이 없어요. 개념 확인과 학습 계획을 먼저 만들어 주세요.')
    create.mutate(
      {
        concept_version_id: concept.versionId,
        task_id: task?.concept_version_ids.includes(concept.versionId) ? task.id : null,
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
        <Button onClick={onStart} disabled={create.isPending || checking || list.length === 0}>
          {create.isPending ? '설명을 준비하고 있어요…' : '설명 시작하기'}
        </Button>
      }
      className="gap-[22px]"
    >
      <PageTitle
        title="이번엔 내가 선생님이에요"
        desc="개념 확인에서 틀린 부분을 AI 학생에게 설명해 주세요."
      />

      <section className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold">설명할 약점</p>
          <p className="text-xs text-muted">최소 1개는 남겨요</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {list.map((c) => (
            <li
              key={c.versionId}
              className="flex items-center gap-[6px] rounded-full border-[1.5px] border-primary/30 bg-primary-soft py-[7px] pr-[8px] pl-[14px] text-sm font-bold text-primary"
            >
              {c.name}
              {c.wrong ? (
                <span className="text-xs font-medium text-primary/70">틀림 {c.wrong}</span>
              ) : null}
              <button
                type="button"
                aria-label={`${c.name} 빼기`}
                disabled={list.length <= 1}
                onClick={() => setRemoved((r) => [...r, c.versionId])}
                className="flex size-5 items-center justify-center rounded-full hover:bg-primary/10 disabled:opacity-30"
              >
                <XIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
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
          질문은 날카롭고 어려워요. 개념 확인에서 틀린 부분을 집중해서 물어봐요.
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
