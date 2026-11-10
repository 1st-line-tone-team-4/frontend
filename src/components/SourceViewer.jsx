import { SOURCE_PAGES } from '@/data/flow'
import { useQuery } from '@tanstack/react-query'
import { USE_MOCK } from '@/api/client'
import { getMaterialSource } from '@/api/study'
import { useAuthStore } from '@/stores/useAuthStore'

function LiveSourceViewer({ materialId, page = 1, excerpt, highlight, zoom = 1, className = '' }) {
  const session = useAuthStore((s) => s.sessionVersion)
  const source = useQuery({
    queryKey: ['material-source', materialId, page, session],
    queryFn: ({ signal }) => getMaterialSource(materialId, page, { signal }),
    enabled: !!materialId && Number.isInteger(page) && page >= 1,
    staleTime: 240000,
    gcTime: 0,
    retry: false,
  })
  if (!materialId)
    return (
      <p className="rounded-xl bg-cool p-4 text-sm">
        자료 식별자가 없어 원본을 표시할 수 없어요. 내 자료에서 원본을 열어 주세요.
      </p>
    )
  const citation = excerpt || highlight
  const url = source.data?.url
  const safeUrl =
    typeof url === 'string' &&
    (/^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//')))
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {citation && (
        <blockquote className="rounded-xl bg-[#fff3b0] p-3 text-sm whitespace-pre-wrap">
          {citation}
        </blockquote>
      )}
      {source.isPending && <p role="status">원본을 불러오고 있어요.</p>}
      {source.isError && <p role="alert">원본을 불러오지 못했어요. {source.error.message}</p>}
      {safeUrl &&
        (source.data.mime_type.startsWith('image/') ? (
          <img
            src={url}
            alt={`업로드한 자료 ${page}쪽`}
            className="w-full rounded-xl"
            style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
          />
        ) : (
          <iframe
            src={url}
            title={`업로드한 원본 ${page}쪽`}
            className="min-h-[460px] w-full rounded-xl border border-line"
            sandbox="allow-same-origin"
            referrerPolicy="no-referrer"
          />
        ))}
      {safeUrl && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-primary"
        >
          원본을 새 창에서 열기
        </a>
      )}
      <button
        type="button"
        onClick={() => source.refetch()}
        className="text-sm font-bold text-primary"
      >
        원본 링크 새로 받기
      </button>
      <p className="text-xs text-muted">
        원본 링크는 5분 동안 유효해요. 표시되지 않으면 새 창에서 열거나 링크를 새로 받아 주세요.
      </p>
    </div>
  )
}

/**
 * 강의자료 페이지 미리보기 (A-02 · A-07 자료 뷰어, A-16 근거 자료 보기)
 * - page: 쪽 번호 · highlight: 강조할 문장(없으면 그 페이지의 기본 근거 문장) · plain: 하이라이트 없이
 */
export default function SourceViewer(props) {
  return USE_MOCK ? <MockSourceViewer {...props} /> : <LiveSourceViewer {...props} />
}

function MockSourceViewer({ page, highlight, plain = false, zoom = 1, className = '' }) {
  const data = SOURCE_PAGES[page]
  const marks = plain ? [] : highlight ? [highlight] : (data?.highlights ?? [])
  const isMarked = (line) => marks.some((m) => line.includes(m) || m.includes(line))

  return (
    <div
      className={`origin-top rounded-xl border border-line bg-white px-5 py-6 shadow-[0_6px_24px_-10px_rgba(30,40,66,0.18)] ${className}`}
      style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined }}
    >
      {data ? (
        <div className="flex flex-col gap-[10px] font-serif">
          <p className="text-[15px] font-bold text-ink">{data.heading}</p>
          {data.lines.map((line) => (
            <p
              key={line}
              className={`text-[13px] leading-[1.7] ${
                isMarked(line)
                  ? 'rounded bg-[#fff3b0] px-1 font-bold text-ink shadow-[inset_0_-2px_0_#f5d14a]'
                  : 'text-sub'
              }`}
            >
              {line}
            </p>
          ))}
          {/* 페이지 나머지 (회색 줄) */}
          {[80, 92, 64, 88].map((w) => (
            <span key={w} className="h-2 rounded-full bg-cool" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[90, 70, 85, 60, 95, 75].map((w, i) => (
            <span key={i} className="h-2 rounded-full bg-cool" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      <p className="mt-5 text-center text-[11px] font-medium text-muted">— {page} —</p>
    </div>
  )
}
