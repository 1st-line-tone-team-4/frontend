import { SOURCE_PAGES } from '@/data/flow'

/**
 * 강의자료 페이지 미리보기 (A-02 · A-07 자료 뷰어, A-16 근거 자료 보기)
 * - page: 쪽 번호 · highlight: 강조할 문장(없으면 그 페이지의 기본 근거 문장) · plain: 하이라이트 없이
 */
export default function SourceViewer({ page, highlight, plain = false, zoom = 1, className = '' }) {
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
