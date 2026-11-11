import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import { USE_MOCK } from '@/api/client'
import SessionGate from '@/components/SessionGate'
import UnavailableFeature from '@/components/UnavailableFeature'

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

// These designs have no live service contract. Never show demo submission,
// deletion, verification, or payment success in a live authenticated session.
const unavailable = {
  '/lectures': ['강의 찾기', '강의 카탈로그는 준비 중이에요. 가지고 있는 자료를 업로드해 주세요.'],
  '/lectures/exam': ['강의 학습', '강의 자료 연결은 준비 중이에요.'],
  '/mock': ['모의고사', '전체 자료 모의고사는 준비 중이에요. 단원별 문제 풀기를 이용해 주세요.'],
  '/mock/solve': ['모의고사', '실제 모의고사 응시와 결과 저장은 아직 지원하지 않아요.'],
  '/mock/result': ['모의고사 결과', '아직 저장된 실제 모의고사 결과가 없어요.'],
  '/bank': ['문제은행', '공개 문제 게시와 응시는 아직 연결되지 않았어요.'],
  '/bank/solve': ['문제은행', '공개 문제 응시는 아직 연결되지 않았어요.'],
  '/explore': ['탐색', '공개 자료와 문제 공유는 준비 중이에요.'],
  '/records/verify': ['성적 인증', '성적 인증 제출과 심사는 아직 연결되지 않았어요.'],
  '/records/verify/result': ['성적 인증', '실제 제출된 인증 결과를 조회할 수 없는 상태예요.'],
  '/settings/notifications': ['알림 설정', '서버 알림 발송과 구독 설정은 아직 연결되지 않았어요.'],
  '/settings/withdraw': [
    '회원 탈퇴',
    '현재 앱에서 서버 계정과 자료를 삭제하는 회원 탈퇴 기능은 지원하지 않아요.',
  ],
}

function liveRoute(route) {
  const missing = !USE_MOCK && unavailable[route.path]
  const element = missing ? (
    <UnavailableFeature title={missing[0]} description={missing[1]} />
  ) : (
    route.element
  )
  return {
    ...route,
    element: ['/', '/login', '*'].includes(route.path) ? (
      element
    ) : (
      <SessionGate>{element}</SessionGate>
    ),
  }
}

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
    ].map(liveRoute),
  },
])
