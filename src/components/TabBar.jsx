import { NavLink } from 'react-router-dom'
import home from '@/assets/icons/home.svg'
import homeOn from '@/assets/icons/home-active.svg'
import calendar from '@/assets/icons/calendar.svg'
import calendarOn from '@/assets/icons/calendar-active.svg'
import folder from '@/assets/icons/folder.svg'
import folderOn from '@/assets/icons/folder-active.svg'
import compass from '@/assets/icons/compass.svg'
import compassOn from '@/assets/icons/compass-active.svg'
import chart from '@/assets/icons/chart.svg'
import chartOn from '@/assets/icons/chart-active.svg'

// TM/TabBar · 하단 탭 · 오늘/계획/내 자료/둘러보기/기록 (설정은 상단 프로필)
const tabs = [
  { to: '/today', label: '오늘', icon: home, iconOn: homeOn },
  { to: '/plan', label: '계획', icon: calendar, iconOn: calendarOn },
  { to: '/materials', label: '내 자료', icon: folder, iconOn: folderOn },
  { to: '/explore', label: '둘러보기', icon: compass, iconOn: compassOn },
  { to: '/records', label: '기록', icon: chart, iconOn: chartOn },
]

export default function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 flex justify-between border-t border-line bg-white px-[22px] pt-[10px] pb-[max(8px,env(safe-area-inset-bottom))]">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className="flex flex-col items-center gap-1">
          {({ isActive }) => (
            <>
              <img src={isActive ? t.iconOn : t.icon} alt="" className="size-[22px]" />
              <span className={`text-[11px] leading-[1.3] ${isActive ? 'font-bold text-primary' : 'text-muted'}`}>
                {t.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
