import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import { getMaterialSource } from '@/api/study'
import Button from '@/components/Button'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '@/components/icons'
import { toast } from '@/components/Overlay'
import SourceViewer from '@/components/SourceViewer'
import { FILE, SOURCE_PAGES } from '@/data/flow'
import { useMaterialChunk } from '@/hooks/useStudyApi'

const ZOOMS = [1, 1.25, 1.5]

// A-16 근거 자료 보기 (공통) · ?page=24 · ?plain=1 이면 하이라이트 없이(13 '원본 보기')
// 실제 API: ?material=자료ID&page=쪽&chunk=근거ID → 근거 원문(GET /chunks/{id}) + 원본 열기(GET /source)
export default function SourcePage() {
  const [params] = useSearchParams()
  if (!USE_MOCK && params.get('material')) return <LiveSource />
  return <MockSource />
}

function LiveSource() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const materialId = params.get('material')
  const page = Number(params.get('page')) || 1
  const chunk = useMaterialChunk(materialId, params.get('chunk'))
  const [opening, setOpening] = useState(false)

  // 원본 signed URL 은 5분만 유효해서 누를 때 받아요
  const openOriginal = async () => {
    setOpening(true)
    try {
      const { url, mime_type } = await getMaterialSource(materialId, page)
      window.open(
        mime_type === 'application/pdf' ? `${url}#page=${page}` : url,
        '_blank',
        'noopener',
      )
    } catch (err) {
      toast(err.message)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-ink/[0.04]">
      <header className="flex items-center justify-between bg-white px-3 py-2">
        <div className="flex flex-col pl-2 leading-[1.35]">
          <p className="text-base font-bold">근거 자료</p>
          <p className="text-xs text-sub">
            {chunk.data?.material_name ?? ''} · p.{chunk.data?.page_number ?? page}
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
        <div className="rounded-xl border border-line bg-white px-5 py-6 shadow-[0_6px_24px_-10px_rgba(30,40,66,0.18)]">
          {chunk.isLoading ? (
            <p className="text-[13px] text-sub">불러오는 중이에요…</p>
          ) : chunk.data ? (
            <p className="rounded bg-[#fff3b0] px-1 font-serif text-[13px] leading-[1.7] font-bold whitespace-pre-line text-ink shadow-[inset_0_-2px_0_#f5d14a]">
              {chunk.data.excerpt}
            </p>
          ) : (
            <p className="text-[13px] text-sub">
              {chunk.error?.message ?? '근거 문장 없이 원본만 볼 수 있어요.'}
            </p>
          )}
          <p className="mt-5 text-center text-[11px] font-medium text-muted">
            — {chunk.data?.page_number ?? page} —
          </p>
        </div>
      </main>

      <footer className="flex flex-col gap-3 bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <Button onClick={openOriginal} disabled={opening}>
          원본에서 보기
        </Button>
      </footer>
    </div>
  )
}

function MockSource() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const plain = params.get('plain') === '1'
  const file = params.get('file') ?? FILE
  const pages = Object.keys(SOURCE_PAGES).map(Number)
  const [page, setPage] = useState(Number(params.get('page')) || (plain ? 1 : pages[0]))
  const [zoom, setZoom] = useState(0)
  const marks = SOURCE_PAGES[page]?.highlights ?? []
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
          page={page}
          plain={plain}
          highlight={!plain && marks.length > 1 ? marks[markIdx] : undefined}
          zoom={ZOOMS[zoom]}
        />
      </main>

      <footer className="flex flex-col gap-3 bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        {!plain && (
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
              onClick={() => {
                setPage((p) => Math.min(32, p + 1))
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
