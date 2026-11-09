import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/Overlay'

export default function RootLayout() {
  const { pathname } = useLocation()
  // 화면이 바뀌면 맨 위부터
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}
