import iconFile from '@/assets/icons/file-xs.svg'

// 근거 표시 (파일 아이콘 + 파일명 p.xx)
export default function Source({ children, className = '' }) {
  return (
    <span className={`flex items-center gap-1 text-xs leading-[1.3] font-medium text-muted ${className}`}>
      <img src={iconFile} alt="" className="size-[13px]" />
      {children}
    </span>
  )
}
