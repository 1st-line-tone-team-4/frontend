import Button from '@/components/Button'
import Logo from '@/components/Logo'
import Screen from '@/components/Screen'

// 01 랜딩
export default function LandingPage() {
  return (
    <Screen bottom={<Button to="/upload">자료 업로드하고 시작</Button>} className="items-center justify-center !px-6">
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
