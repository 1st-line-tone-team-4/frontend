import { useNavigate } from 'react-router-dom'
import Button from '@/components/Button'
import Logo from '@/components/Logo'
import Screen from '@/components/Screen'
import { timeAgo, useResumeStore } from '@/stores/useResumeStore'

// 01 랜딩 · 이 기기에 공부하던 기록이 있으면 '이어서 하기'를 먼저 보여줘요
export default function LandingPage() {
  const navigate = useNavigate()
  const last = useResumeStore((s) => s.last)

  const bottom = last ? (
    <>
      <Button onClick={() => navigate(last.path, { state: last.state })}>이어서 하기</Button>
      <p className="text-[13px] leading-[1.4] text-sub">
        {last.label} · {timeAgo(last.savedAt)}
      </p>
      <Button to="/upload" variant="secondary">
        새 자료 업로드하기
      </Button>
    </>
  ) : (
    <Button to="/upload">자료 업로드하고 시작</Button>
  )

  return (
    <Screen bottom={bottom} className="items-center justify-center !px-6">
      <Logo variant="full" className="mt-[-40px]" />
      <div className="mt-[46px] flex w-full flex-col items-center gap-4 text-center font-bold">
        <p className="text-lg leading-[1.4] text-sub">설명할수록 내 것이 되는 개념</p>
        <p className="text-[30px] leading-[1.3] tracking-[-0.9px]">
          설명할 수 있을 때,
          <br />
          진짜 내 실력
        </p>
      </div>
    </Screen>
  )
}
