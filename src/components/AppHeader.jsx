import { Link } from 'react-router-dom'
import iconUser from '@/assets/icons/user.svg'
import Logo from './Logo'
import SubjectSwitcher from './SubjectSwitcher'

// TM/AppHeader · 탭 화면 상단 · 로고 + 지금 과목(눌러서 바꾸기) + 프로필(설정 진입)
export default function AppHeader() {
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <Link to="/today" aria-label="홈" className="shrink-0">
        <Logo />
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <SubjectSwitcher />
        <Link
          to="/profile"
          aria-label="프로필·설정"
          className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-cool"
        >
          <img src={iconUser} alt="" className="size-[18px]" />
        </Link>
      </div>
    </div>
  )
}
