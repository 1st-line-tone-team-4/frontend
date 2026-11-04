import { NavLink, Outlet } from 'react-router-dom'

// 모바일 웹 기본 틀 (최대 430px 가운데 정렬)
export default function RootLayout() {
  const link = ({ isActive }) => (isActive ? 'font-bold text-blue-600' : 'text-gray-500')
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col border-x border-gray-100">
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <nav className="sticky bottom-0 flex justify-around border-t border-gray-100 bg-white py-3 text-sm">
        <NavLink to="/" end className={link}>
          홈
        </NavLink>
        <NavLink to="/about" className={link}>
          예시 페이지
        </NavLink>
      </nav>
    </div>
  )
}
