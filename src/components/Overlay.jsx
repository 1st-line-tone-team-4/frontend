import { useEffect } from 'react'
import { create } from 'zustand'
import Button from './Button'

/* ── 토스트 ───────────────────────────────────── */
export const useToast = create((set) => ({
  message: null,
  show: (message) => {
    set({ message })
    clearTimeout(useToast.timer)
    useToast.timer = setTimeout(() => set({ message: null }), 2400)
  },
}))
export const toast = (message) => useToast.getState().show(message)

export function Toaster() {
  const message = useToast((s) => s.message)
  if (!message) return null
  return (
    <div
      role="status"
      className="animate-pop-in pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6"
    >
      <p className="max-w-[382px] rounded-[14px] bg-ink/92 px-4 py-3 text-center text-sm leading-[1.5] font-medium text-white shadow-lg">
        {message}
      </p>
    </div>
  )
}

/* ── 공통: 배경 + Esc 닫기 ───────────────────── */
function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

/* ── 확인 팝업 ───────────────────────────────── */
export function Modal({
  open,
  title,
  desc,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger,
  onConfirm,
  onClose,
}) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col gap-5 rounded-[20px] bg-white p-6"
      >
        <div className="flex flex-col gap-2 text-center">
          <h2 id="modal-title" className="text-[17px] leading-[1.4] font-bold tracking-[-0.17px]">
            {title}
          </h2>
          {desc && <p className="text-sm leading-[1.55] whitespace-pre-line text-sub">{desc}</p>}
        </div>
        <div className="flex gap-2">
          {cancelLabel && (
            <Button variant="secondary" className="h-12 flex-1 text-[15px]" onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button
            className={`h-12 flex-1 text-[15px] ${danger ? '!bg-error' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── 바텀시트 ───────────────────────────────── */
export function BottomSheet({ open, title, onClose, children, footer }) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-[24px] bg-white"
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>
        {title && (
          <h2 className="px-6 pt-4 pb-1 text-lg leading-[1.4] font-bold tracking-[-0.18px]">
            {title}
          </h2>
        )}
        <div className="flex flex-col gap-4 overflow-y-auto px-6 pt-3 pb-4">{children}</div>
        {footer && (
          <div className="flex flex-col gap-2 border-t border-line px-6 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
