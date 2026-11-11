import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '@/components/icons'
import SourceViewer from '@/components/SourceViewer'
import { FILE, SOURCE_PAGES } from '@/data/flow'
import { USE_MOCK } from '@/api/client'
import { useMaterial } from '@/hooks/useMaterialApi'
import { useQuery } from '@tanstack/react-query'
import { getMaterialChunk } from '@/api/study'
import { useAuthStore } from '@/stores/useAuthStore'

const ZOOMS = [1, 1.25, 1.5]

// A-16 근거 자료 보기 (공통) · ?page=24 · ?plain=1 이면 하이라이트 없이(13 '원본 보기')
export default function SourcePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const plain = params.get('plain') === '1'
  const materialId = params.get('materialId') || params.get('material')
  const chunkId = params.get('chunkId')
  const session = useAuthStore((s) => s.sessionVersion)
  const chunk = useQuery({
    queryKey: ['material-chunk', materialId, chunkId, session],
    queryFn: ({ signal }) => getMaterialChunk(materialId, chunkId, { signal }),
    enabled: !USE_MOCK && !!materialId && !!chunkId,
  })
  const material = useMaterial(materialId)
  const file = USE_MOCK
    ? (params.get('file') ?? FILE)
    : (material.data?.filename ?? '업로드한 자료')
  const pages = Object.keys(SOURCE_PAGES).map(Number)
  const [page, setPage] = useState(
    Math.max(1, Number(params.get('page')) || (USE_MOCK && !plain ? pages[0] : 1)),
  )
  const maxPage = USE_MOCK ? 32 : (material.data?.page_count ?? 1)
  const [zoom, setZoom] = useState(0)
  const marks = USE_MOCK ? (SOURCE_PAGES[page]?.highlights ?? []) : []
  const [markIdx, setMarkIdx] = useState(0)

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-ink/[0.04]">
      <header className="flex items-center justify-between bg-white px-3 py-2">
        <div className="flex flex-col pl-2 leading-[1.35]">
          <p className="text-base font-bold">근거 자료</p>
          <p className="text-xs text-sub">
            {file} · p.{page}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="닫기"
          className="flex size-10 items-center justify-center rounded-full hover:bg-cool"
        >
          <XIcon size={22} />
        </button>
      </header>

      <main className="flex-1 overflow-auto px-5 py-5">
        <SourceViewer
          materialId={materialId}
          excerpt={!USE_MOCK && chunk.data?.page_number === page ? chunk.data.excerpt : undefined}
          page={page}
          plain={plain}
          highlight={!plain && marks.length > 1 ? marks[markIdx] : undefined}
          zoom={ZOOMS[zoom]}
        />
      </main>

      <footer className="flex flex-col gap-3 bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        {!plain && USE_MOCK && (
          <div className="flex items-center justify-between">
            <p className="rounded-full bg-[#fff3b0] px-3 py-1 text-xs font-bold text-ink">
              이 페이지가 근거예요
            </p>
            {marks.length > 1 && (
              <div className="flex items-center gap-2 text-xs font-bold text-sub">
                <button
                  type="button"
                  onClick={() => setMarkIdx((i) => (i - 1 + marks.length) % marks.length)}
                >
                  이전 근거
                </button>
                <span className="text-muted">
                  {markIdx + 1}/{marks.length}
                </span>
                <button type="button" onClick={() => setMarkIdx((i) => (i + 1) % marks.length)}>
                  다음 근거
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 쪽"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1))
                setMarkIdx(0)
              }}
              className="flex size-10 items-center justify-center rounded-full bg-cool"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <span className="w-14 text-center text-sm font-bold tabular-nums">p.{page}</span>
            <button
              type="button"
              aria-label="다음 쪽"
              disabled={page >= maxPage}
              onClick={() => {
                setPage((p) => Math.min(maxPage, p + 1))
                setMarkIdx(0)
              }}
              className="flex size-10 items-center justify-center rounded-full bg-cool"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setZoom((z) => (z + 1) % ZOOMS.length)}
            className="rounded-full bg-cool px-4 py-2 text-sm font-bold text-sub"
          >
            확대 {Math.round(ZOOMS[zoom] * 100)}%
          </button>
        </div>
      </footer>
    </div>
  )
}
