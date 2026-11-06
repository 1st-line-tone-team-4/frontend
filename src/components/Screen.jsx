import AppHeader from './AppHeader'
import TopBar from './TopBar'
import TabBar from './TabBar'

/**
 * 화면 공통 틀
 * - header: 'app'(로고+프로필, 탭 화면) | { title, dday }(뒤로가기 하위 화면) | undefined
 * - bottom: 하단 고정 영역 (주요 버튼)
 * - tabs: 하단 탭 표시
 */
export default function Screen({ header, bottom, tabs = false, className = '', children }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white">
      {header && (
        <div className="sticky top-0 z-10 bg-white px-6 pt-2 pb-1">
          {header === 'app' ? <AppHeader /> : <TopBar title={header.title} dday={header.dday} />}
        </div>
      )}
      <main className={`flex flex-1 flex-col gap-4 px-6 pt-4 pb-6 ${className}`}>{children}</main>
      {bottom && (
        <div className="sticky bottom-0 z-10 flex flex-col items-center gap-[10px] border-t border-line bg-white px-6 pt-[14px] pb-[max(30px,env(safe-area-inset-bottom))]">
          {bottom}
        </div>
      )}
      {tabs && <TabBar />}
    </div>
  )
}

// 제목 + 설명
export function PageTitle({ eyebrow, title, desc, children }) {
  return (
    <div className="flex flex-col gap-[6px]">
      {eyebrow && <p className="text-[13px] leading-[1.4] text-sub">{eyebrow}</p>}
      <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px] whitespace-pre-line">{title}</h1>
      {desc && <p className="text-sm leading-[1.55] text-sub">{desc}</p>}
      {children}
    </div>
  )
}

// 하단 영역 안내 문구
export function BottomNote({ children }) {
  return <p className="text-center text-xs leading-[1.5] text-sub">{children}</p>
}
