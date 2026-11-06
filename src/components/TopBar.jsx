import { useNavigate } from 'react-router-dom'
import iconLeft from '@/assets/icons/left.svg'
import Chip from './Chip'

// TM/TopBar · 하위 화면 상단 · 뒤로가기 + 제목 + D-day
export default function TopBar({ title, dday }) {
  const navigate = useNavigate()
  return (
    <div className="flex h-8 items-center justify-between">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1">
        <img src={iconLeft} alt="뒤로" className="size-6" />
        <span className="text-base leading-[1.3] font-bold">{title}</span>
      </button>
      {dday && (
        <Chip tone="primary" className="text-xs">
          {dday}
        </Chip>
      )}
    </div>
  )
}
