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
// 추가 화면 (A-01 ~ A-22)
import UnitPage from '@/pages/UnitPage'
import LearnPage from '@/pages/LearnPage'
import QuizResultPage from '@/pages/QuizResultPage'
import TeachAnalyzingPage from '@/pages/TeachAnalyzingPage'
import ReviewPage from '@/pages/ReviewPage'
import MockIntroPage from '@/pages/MockIntroPage'
import MockSolvePage from '@/pages/MockSolvePage'
import MockResultPage from '@/pages/MockResultPage'
import BankPage from '@/pages/BankPage'
import BankSolvePage from '@/pages/BankSolvePage'
import VerifyResultPage from '@/pages/VerifyResultPage'
import SourcePage from '@/pages/SourcePage'
import LoginPage from '@/pages/LoginPage'
import AccountPage from '@/pages/settings/AccountPage'
import NotificationPage from '@/pages/settings/NotificationPage'
import AppSettingsPage from '@/pages/settings/AppSettingsPage'
import WithdrawPage from '@/pages/settings/WithdrawPage'
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
      { path: '/study', element: <StudyPage /> }, // 07 (API 연결본 · A-02 로 대체 예정)
      { path: '/unit', element: <UnitPage /> }, // A-01
      { path: '/learn', element: <LearnPage /> }, // A-02
      { path: '/quiz', element: <QuizCreatePage /> }, // A-03
      { path: '/quiz/advanced', element: <QuizCreatePage mode="advanced" /> }, // A-08
      { path: '/quiz/solve', element: <QuizSolvePage /> }, // 09
      { path: '/quiz/result', element: <QuizResultPage /> }, // A-04
      { path: '/teach/prepare', element: <TeachPreparePage /> }, // 10
      { path: '/teach', element: <TeachChatPage /> }, // A-05
      { path: '/teach/analyzing', element: <TeachAnalyzingPage /> }, // A-06
      { path: '/report', element: <ReportPage /> }, // 12
      { path: '/review', element: <ReviewPage /> }, // A-07
      { path: '/mock', element: <MockIntroPage /> }, // A-09
      { path: '/mock/solve', element: <MockSolvePage /> }, // A-10
      { path: '/mock/result', element: <MockResultPage /> }, // A-11
      { path: '/bank', element: <BankPage /> }, // A-12
      { path: '/bank/solve', element: <BankSolvePage /> }, // A-13
      { path: '/source', element: <SourcePage /> }, // A-16
      { path: '/login', element: <LoginPage /> }, // A-18
      { path: '/materials', element: <MaterialsPage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/records', element: <RecordsPage /> },
      { path: '/records/verify', element: <ScoreVerifyPage /> },
      { path: '/records/verify/result', element: <VerifyResultPage /> }, // A-15
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings/account', element: <AccountPage /> }, // A-19
      { path: '/settings/notifications', element: <NotificationPage /> }, // A-20
      { path: '/settings/app', element: <AppSettingsPage /> }, // A-21
      { path: '/settings/withdraw', element: <WithdrawPage /> }, // A-22
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
