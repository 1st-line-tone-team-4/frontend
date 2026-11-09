import { Link } from 'react-router-dom'
import iconFile from '@/assets/icons/file-xs.svg'

/**
 * 근거 페이지 칩 · 누르면 A-16 근거 자료 보기로 이동
 * - page: 근거 쪽 (24) · label: 표시 문구(기본 'p.24') · onClick 이 있으면 이동 대신 실행(A-02 자료 뷰어 이동)
 */
export default function SourceChip({
  page,
  label,
  file = '토익 문법 정리.pdf',
  onClick,
  className = '',
}) {
  const cls = `inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-white px-2 py-[3px] text-[11px] leading-[1.3] font-bold text-sub hover:border-primary hover:text-primary ${className}`
  const content = (
    <>
      <img src={iconFile} alt="" className="size-3" />
      {label ?? `p.${page}`}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    )
  }
  return (
    <Link to={`/source?file=${encodeURIComponent(file)}&page=${page}`} className={cls}>
      {content}
    </Link>
  )
}
