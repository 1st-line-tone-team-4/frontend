import { Link } from 'react-router-dom'
import iconFile from '@/assets/icons/file-xs.svg'

// 근거 표시 (파일 아이콘 + 파일명 p.xx)
export default function Source({ children, materialId, page, chunkId, className = '' }) {
  const content = (
    <>
      <img src={iconFile} alt="" className="size-[13px]" />
      {children}
    </>
  )
  const cls = `flex items-center gap-1 text-xs leading-[1.3] font-medium text-muted ${className}`
  if (materialId) {
    const params = new URLSearchParams({ materialId })
    if (page) params.set('page', String(page))
    if (chunkId) params.set('chunkId', chunkId)
    return (
      <Link to={`/source?${params}`} className={`${cls} hover:text-primary underline`}>
        {content}
      </Link>
    )
  }
  return <span className={cls}>{content}</span>
}
