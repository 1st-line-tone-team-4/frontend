import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import Button from './Button'
import Chip from './Chip'
import { CheckIcon, ChevronDownIcon } from './icons'
import { BottomSheet, Modal, toast } from './Overlay'
import { useCurrentExamGoal, useSwitchExamGoal, useUpdateExamGoal } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { daysUntil, formatDday, formatKoreanDate } from '@/utils/format'

/**
 * 상단 과목(시험 목표) 바꾸기 · 추가 · 삭제
 * - 바꾸면 그 목표의 진행 중 계획 · 자료로 오늘 · 계획 · 문제 · 설명이 모두 바뀌어요
 * - 삭제: API 에 목표 삭제가 없어서 PATCH status=paused 로 목록에서 빼요 (서버 기록은 남아요)
 */
export default function SubjectSwitcher() {
  const navigate = useNavigate()
  const setIds = useStudyStore((s) => s.setIds)
  const { goals, active, current } = useCurrentExamGoal()
  const switchGoal = useSwitchExamGoal()
  const updateGoal = useUpdateExamGoal()
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(null) // 삭제 확인 중인 목표

  if (USE_MOCK || !goals.data) return null
  const busy = switchGoal.isPending || updateGoal.isPending

  const pick = (goal) => {
    if (goal.id === current?.id) return setOpen(false)
    switchGoal.mutate(goal, {
      onSuccess: ({ plan }) => {
        setOpen(false)
        toast(
          plan
            ? `‘${goal.title}’로 바꿨어요.`
            : `‘${goal.title}’로 바꿨어요. 아직 학습 계획이 없어요.`,
        )
        navigate('/today')
      },
      onError: (err) => toast(err.message),
    })
  }

  const addSubject = () => {
    setOpen(false)
    navigate('/upload')
  }

  const confirmRemove = () => {
    const goal = removing
    updateGoal.mutate(
      { id: goal.id, status: 'paused' },
      {
        onSuccess: () => {
          setRemoving(null)
          toast(`‘${goal.title}’를 삭제했어요.`)
          if (goal.id !== current?.id) return
          // 지금 과목을 지웠으면 남은 과목으로 바꾸고, 없으면 흐름 ID 를 비워요
          const next = active.find((g) => g.id !== goal.id)
          if (next) return pick(next)
          setIds({
            examGoalId: null,
            examDate: null,
            planId: null,
            materialId: null,
            materialIds: [],
            questionSetId: null,
            sessionId: null,
          })
          setOpen(false)
          navigate('/today')
        },
        onError: (err) => {
          setRemoving(null)
          toast(err.message)
        },
      },
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={current ? `지금 과목 ${current.title} · 과목 바꾸기` : '과목 추가하기'}
        className="flex min-w-0 items-center gap-1 rounded-full bg-cool py-[5px] pr-2 pl-3 text-[13px] leading-[1.3] font-bold text-ink"
      >
        <span className="truncate">{current?.title ?? '과목 추가'}</span>
        <ChevronDownIcon size={16} className="shrink-0 text-sub" />
      </button>

      <BottomSheet open={open} title="과목" onClose={() => setOpen(false)}>
        {/* 과목 추가 = 새 자료 올리기 */}
        <Button onClick={addSubject} disabled={busy}>
          + 새 과목 추가 · 자료 올리기
        </Button>

        {active.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {active.map((g) => {
              const on = g.id === current?.id
              const days = daysUntil(g.exam_date)
              return (
                <li
                  key={g.id}
                  className={`flex items-center gap-2 rounded-[14px] py-1 pr-2 pl-1 ${
                    on
                      ? 'border-[1.5px] border-primary bg-primary-soft'
                      : 'border border-line bg-white'
                  }`}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => pick(g)}
                    aria-current={on}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-[10px] text-left disabled:opacity-60"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="truncate text-[15px] leading-[1.4] font-bold">
                        {g.title}
                      </span>
                      <span className="text-xs text-sub">시험 {formatKoreanDate(g.exam_date)}</span>
                    </span>
                    {days !== null && days >= 0 && (
                      <Chip tone={on ? 'solid' : 'cool'}>{formatDday(days)}</Chip>
                    )}
                    {on && <CheckIcon size={18} className="shrink-0 text-primary" />}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setRemoving(g)}
                    aria-label={`${g.title} 삭제`}
                    className="shrink-0 rounded-lg px-2 py-[6px] text-xs font-bold text-error hover:bg-error-soft disabled:opacity-40"
                  >
                    삭제
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-sub">진행 중인 과목이 없어요.</p>
        )}
        {busy && <p className="text-center text-xs text-muted">처리하고 있어요…</p>}
      </BottomSheet>

      <Modal
        open={!!removing}
        title="정말 삭제하시겠습니까?"
        desc={
          removing
            ? `‘${removing.title}’ 과목을 목록에서 삭제해요.\n이 과목의 오늘 할 일과 학습 계획이 더 이상 보이지 않아요.`
            : ''
        }
        confirmLabel={updateGoal.isPending ? '삭제하는 중…' : '삭제하기'}
        cancelLabel="취소"
        danger
        onConfirm={() => !updateGoal.isPending && confirmRemove()}
        onClose={() => !updateGoal.isPending && setRemoving(null)}
      />
    </>
  )
}
