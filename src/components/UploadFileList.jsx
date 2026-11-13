import iconFile from '@/assets/icons/file.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconTrash from '@/assets/icons/trash.svg'
import iconRefresh from '@/assets/icons/refresh.svg'
import Chip from '@/components/Chip'
import { canRestartItem, canRetryItem } from '@/stores/useUploadQueueStore'
import { formatBytes, MIME_LABEL } from '@/utils/format'

const STATUS_CHIP = {
  idle: { label: '업로드 전', tone: 'cool' },
  waiting: { label: '대기 중', tone: 'cool' },
  uploading: { label: '업로드 중', tone: 'primary' },
  analyzing: { label: '분석 중', tone: 'secondary' },
  succeeded: { label: '업로드 완료', tone: 'primary' },
  failed: { label: '실패', tone: 'error' },
}

const pagesLabel = (item) => {
  if (item.pagesStatus === 'counting') return '페이지 계산 중'
  return item.pages ? `${item.pages}페이지` : null
}

// 업로드 파일 목록 (파일별 상태 · 삭제 · 재시도)
export default function UploadFileList({ items, onRemove, onRetry }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const chip = STATUS_CHIP[item.status]
        const meta = [MIME_LABEL[item.mime], pagesLabel(item), formatBytes(item.size)]
          .filter(Boolean)
          .join(' · ')
        return (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-[14px] border border-line px-4 py-[14px]"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cool">
                <img src={iconFile} alt="" className="size-[19.2px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[1.4]">
                <span className="truncate text-[15px] font-bold tracking-[-0.15px]">
                  {item.name}
                </span>
                <span className="text-xs text-sub">{meta}</span>
              </span>
              <Chip tone={chip.tone}>
                {item.status === 'succeeded' && (
                  <img src={iconCheck} alt="" className="size-[11px]" />
                )}
                {chip.label}
              </Chip>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`${item.name} 목록에서 삭제`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              >
                <img src={iconTrash} alt="" className="size-4" />
              </button>
            </div>

            {item.status === 'failed' && (
              <div className="flex items-center gap-2 rounded-[10px] bg-error-soft px-3 py-2">
                <p className="flex-1 text-xs leading-[1.5] text-error">{item.error?.message}</p>
                {(canRetryItem(item) || canRestartItem(item)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        canRestartItem(item) &&
                        !window.confirm(
                          '이전 분석이 이미 처리됐을 수도 있어요. 다시 실행하면 한 번 더 처리될 수 있어요. 다시 실행할까요?',
                        )
                      )
                        return
                      onRetry(item.id)
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-bold text-secondary"
                  >
                    <img src={iconRefresh} alt="" className="size-3" />
                    {canRetryItem(item) ? '재시도' : '다시 실행'}
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// 검증에서 제외된 파일 안내
export function RejectedFiles({ rejected }) {
  if (!rejected?.length) return null
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-error-soft px-4 py-3 text-xs leading-[1.5]">
      <p className="font-bold text-error">아래 파일은 추가하지 않았어요</p>
      <ul className="flex flex-col gap-[2px] text-error">
        {rejected.map((r, i) => (
          <li key={`${r.name}-${i}`} className="break-all">
            {r.name} · {r.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}
