import Button from './Button'
import Screen, { PageTitle } from './Screen'

export default function UnavailableFeature({ title, description }) {
  return (
    <Screen header={{ title }} bottom={<Button to="/today">내 학습으로 돌아가기</Button>}>
      <PageTitle title="아직 연결되지 않은 기능이에요" desc={description} />
      <p className="rounded-xl bg-cool p-4 text-sm text-sub">
        이 화면에서는 제출·결제·계정 변경이 이루어지지 않아요. 자료 업로드와 개인 학습은 계속 이용할
        수 있어요.
      </p>
    </Screen>
  )
}
