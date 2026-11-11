import { useRef, useState } from 'react'
import Button from './Button'
import { BottomSheet, toast } from './Overlay'
import { isCanceledError } from '@/api/client'

const REASONS = {
  question: ['정답이 틀림', '문제가 이상함', '자료와 다름', '기타'],
  evaluation: ['판정이 틀림', '근거가 맞지 않음', '내 말을 잘못 받아씀', '기타'],
}

/**
 * A-17 신고 바텀시트 (공통)
 * - kind: 'question'(문제 신고) | 'evaluation'(평가 신고)
 * - onSubmit({ reason, comment }) · 서버 연결이 없으면 제출하지 않음
 */
export default function ReportSheet({ open, kind = 'question', onClose, onSubmit }) {
  const [reason, setReason] = useState(null)
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const close = () => {
    if (pendingRef.current) return
    setReason(null)
    setComment('')
    onClose()
  }
  const submit = async () => {
    if (!onSubmit || !reason || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    try {
      await onSubmit({ reason, comment: comment.trim() })
      toast('접수했어요. 검토 후 반영해요.')
      pendingRef.current = false
      close()
    } catch (err) {
      if (isCanceledError(err)) return
      toast(err?.message ?? '접수하지 못했어요. 다시 시도해 주세요.')
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={kind === 'question' ? '문제 신고' : '평가 신고'}
      footer={
        <Button variant={reason && onSubmit && !pending ? 'primary' : 'disabled'} onClick={submit}>
          {pending ? '접수 중…' : onSubmit ? '신고하기' : '신고 기능 준비 중'}
        </Button>
      }
    >
      <p className="text-sm leading-[1.5] text-sub">
        {onSubmit
          ? '어떤 점이 잘못됐나요?'
          : '이 항목의 신고 접수는 아직 연결되지 않았어요. 입력 내용은 전송되지 않아요.'}
      </p>
      <ul className="flex flex-col gap-2" role="radiogroup">
        {REASONS[kind].map((r) => {
          const on = reason === r
          return (
            <li key={r}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setReason(r)}
                className={`flex w-full items-center justify-between rounded-[14px] px-4 py-[13px] text-left text-[15px] leading-[1.3] ${
                  on
                    ? 'border-[1.5px] border-primary bg-primary-soft font-bold text-primary'
                    : 'border border-line font-medium'
                }`}
              >
                {r}
                <span
                  className={`size-[18px] rounded-full ${on ? 'border-[5px] border-primary bg-white' : 'border-[1.5px] border-line'}`}
                />
              </button>
            </li>
          )
        })}
      </ul>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="자세히 알려주시면 더 빨리 고칠 수 있어요 (선택)"
        className="w-full resize-none rounded-xl bg-cool px-[14px] py-3 text-[15px] leading-[1.5] outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30"
      />
    </BottomSheet>
  )
}
