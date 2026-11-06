import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'

// ① 시작하기
import LandingPage from '@/pages/LandingPage'
import UploadPage from '@/pages/UploadPage'
import LectureSearchPage from '@/pages/LectureSearchPage'
import LectureExamPage from '@/pages/LectureExamPage'
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
// ③ 공유 · 기록 · 관리
import MaterialsPage from '@/pages/MaterialsPage'
import ExplorePage from '@/pages/ExplorePage'
import RecordsPage from '@/pages/RecordsPage'
import ScoreVerifyPage from '@/pages/ScoreVerifyPage'
import ProfilePage from '@/pages/ProfilePage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/upload', element: <UploadPage /> },
      { path: '/lectures', element: <LectureSearchPage /> },
      { path: '/lectures/exam', element: <LectureExamPage /> },
      { path: '/upload/exam', element: <UploadExamPage /> },
      { path: '/concepts', element: <ConceptCheckPage /> },
      { path: '/today', element: <TodayPage /> },
      { path: '/plan', element: <PlanPage /> },
      { path: '/study', element: <StudyPage /> },
      { path: '/quiz', element: <QuizCreatePage /> },
      { path: '/quiz/solve', element: <QuizSolvePage /> },
      { path: '/teach/prepare', element: <TeachPreparePage /> },
      { path: '/teach', element: <TeachChatPage /> },
      { path: '/report', element: <ReportPage /> },
      { path: '/materials', element: <MaterialsPage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/records', element: <RecordsPage /> },
      { path: '/records/verify', element: <ScoreVerifyPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
