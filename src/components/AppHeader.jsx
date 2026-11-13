import { Link } from 'react-router-dom'
import iconUser from '@/assets/icons/user.svg'
import Logo from './Logo'

// TM/AppHeader · 탭 화면 상단 · 로고 + 프로필(설정 진입)
export default function AppHeader() {
  return (
    <div className="flex h-8 items-center justify-between">
      <Link to="/today" aria-label="홈">
        <Logo />
      </Link>
      <Link
        to="/profile"
        aria-label="프로필·설정"
        className="flex size-8 items-center justify-center rounded-2xl bg-cool"
      >
        <img src={iconUser} alt="" className="size-[18px]" />
      </Link>
    </div>
  )
}
