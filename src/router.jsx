import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'

// ① 시작하기
import LandingPage from '@/pages/LandingPage'
import UploadPage from '@/pages/UploadPage'
import UploadExamPage from '@/pages/UploadExamPage'
import ConceptCheckPage from '@/pages/ConceptCheckPage'
// ② 매일 학습
import TodayPage from '@/pages/TodayPage'
import PlanPage from '@/pages/PlanPage'
import StudyPage from '@/pages/StudyPage'
import QuizCreatePage from '@/pages/QuizCreatePage'
import QuizSolvePage from '@/pages/QuizSolvePage'
import TeachPreparePage from '@/pages/TeachPreparePage'
import TeachChatPage from '@/pages/TeachChatPage'
import ReportPage from '@/pages/ReportPage'
// 추가 화면
import QuizResultPage from '@/pages/QuizResultPage'
import TeachAnalyzingPage from '@/pages/TeachAnalyzingPage'
import SourcePage from '@/pages/SourcePage'
// ③ 공유 · 기록 · 관리
import MaterialsPage from '@/pages/MaterialsPage'
import RecordsPage from '@/pages/RecordsPage'
import ProfilePage from '@/pages/ProfilePage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/upload', element: <UploadPage /> },
      { path: '/upload/exam', element: <UploadExamPage /> },
      { path: '/concepts', element: <ConceptCheckPage /> },
      { path: '/today', element: <TodayPage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/study', element: <StudyPage /> }, // 07 (API 연결본 · A-02 로 대체 예정)
      { path: '/quiz', element: <QuizCreatePage /> }, // A-03
      { path: '/quiz/advanced', element: <QuizCreatePage mode="advanced" /> }, // A-08
      { path: '/quiz/solve', element: <QuizSolvePage /> }, // 09
      { path: '/quiz/result', element: <QuizResultPage /> }, // A-04
      { path: '/teach/prepare', element: <TeachPreparePage /> }, // 10
      { path: '/teach', element: <TeachChatPage /> }, // A-05
      { path: '/teach/analyzing', element: <TeachAnalyzingPage /> }, // A-06
      { path: '/report', element: <ReportPage /> }, // 12
      { path: '/source', element: <SourcePage /> }, // A-16
      { path: '/materials', element: <MaterialsPage /> },
      { path: '/records', element: <RecordsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
