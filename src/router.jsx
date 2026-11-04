import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import NotFoundPage from '@/pages/NotFoundPage'

// 화면이 생기면 여기에 경로를 추가하세요
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
