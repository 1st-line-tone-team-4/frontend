import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/Overlay'
import { RESUMABLE, useResumeStore } from '@/stores/useResumeStore'

export default function RootLayout() {
  const { pathname, search, state } = useLocation()
  const saveResume = useResumeStore((s) => s.save)
  // 화면이 바뀌면 맨 위부터
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  // 공부 화면에 들어올 때마다 이 기기에 '마지막 위치'로 저장 → 첫 화면 '이어서 하기'
  useEffect(() => {
    const label = RESUMABLE[pathname]
    if (label) saveResume({ path: pathname + search, label, state: state ?? null, savedAt: Date.now() })
  }, [pathname, search, state, saveResume])
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}
