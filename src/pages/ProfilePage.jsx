import { useNavigate } from 'react-router-dom'
import iconPen from '@/assets/icons/pen-lg.svg'
import iconCard from '@/assets/icons/card.svg'
import iconSettings from '@/assets/icons/settings.svg'
import iconXCircle from '@/assets/icons/x-circle.svg'
import iconTrash from '@/assets/icons/trash-lg.svg'
import iconLogout from '@/assets/icons/logout.svg'
import iconRight from '@/assets/icons/right-muted-16.svg'
import { Divider } from '@/components/Card'
import { BellIcon, SlidersIcon, UserIcon } from '@/components/icons'
import Screen, { PageTitle } from '@/components/Screen'
import { USE_MOCK } from '@/api/client'
import { useDday, useMe } from '@/hooks/useStudyApi'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

const subscriptionMenu = [
  { icon: iconCard, title: '결제 수단 관리', desc: '등록 전 · 요금 확정 후 안내' },
  { icon: iconSettings, title: '구독 설정', desc: '구독 정보 확인' },
  { icon: iconXCircle, title: '구독 해지', desc: '해지 안내 확인' },
]

function MenuList({ items }) {
  return (
    <ul>
      {items.map((m, i) => (
        <li key={m.title}>
          {i > 0 && <Divider />}
          <button
            type="button"
            onClick={m.onClick}
            className="flex w-full items-center gap-3 py-[13px] text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cool">
              {typeof m.icon === 'string' ? (
                <img src={m.icon} alt="" className="size-[17.28px]" />
              ) : (
                <span className="text-sub">{m.icon}</span>
              )}
            </span>
            <span className="flex flex-1 flex-col gap-px leading-[1.4]">
              <span className={`text-[15px] font-medium ${m.muted ? 'text-sub' : ''}`}>
                {m.title}
              </span>
              {m.desc && <span className="text-xs text-muted">{m.desc}</span>}
            </span>
            <img src={iconRight} alt="" className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  )
}

// 17 프로필·설정
export default function ProfilePage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const resetStudy = useStudyStore((s) => s.reset)
  const dday = useDday()
  const me = useMe()
  // 목 모드는 시안의 '지민', 실제 모드는 /me 의 표시 이름
  const name = USE_MOCK ? '지민' : (me.data?.display_name ?? me.data?.email?.split('@')[0] ?? '')

  const settingsMenu = [
    {
      icon: <UserIcon size={18} />,
      title: '계정 설정',
      desc: '프로필 · 로그인 정보 · 목표 시험',
      onClick: () => navigate('/settings/account'),
    },
    {
      icon: <BellIcon size={18} />,
      title: '알림 설정',
      desc: '학습 · 일정 · 결과 알림',
      onClick: () => navigate('/settings/notifications'),
    },
    {
      icon: <SlidersIcon size={18} />,
      title: '앱 설정',
      desc: '화면 · 음성 · 저장 공간 · 정보',
      onClick: () => navigate('/settings/app'),
    },
  ]

  const accountMenu = [
    {
      icon: iconTrash,
      title: '자료 삭제 관리',
      desc: '내 자료를 선택해 삭제할 수 있어요',
      onClick: () => navigate('/materials'),
    },
    {
      icon: iconLogout,
      title: '로그아웃',
      muted: true,
      onClick: () => {
        logout()
        resetStudy()
        navigate('/')
      },
    },
  ]

  return (
    <Screen header={{ title: '프로필·설정', dday }} className="gap-[18px]">
      <PageTitle title="내 학습을 관리해요" desc="프로필 메뉴에서 언제든 설정할 수 있어요." />

      <div className="flex items-center gap-[14px] py-1">
        <span className="flex size-[52px] items-center justify-center rounded-[26px] bg-primary-soft text-[19px] leading-[1.2] font-bold text-primary">
          {name.slice(0, 1)}
        </span>
        <div className="flex flex-1 flex-col gap-[2px] leading-[1.4]">
          <p className="text-[17px] font-bold tracking-[-0.17px]">{name ? `${name}님` : ''}</p>
          <p className="text-[13px] text-sub">차근차근, 내 말로 공부 중</p>
        </div>
        <button type="button" aria-label="프로필 수정">
          <img src={iconPen} alt="" className="size-[18px]" />
        </button>
      </div>

      {/* 구독 (그라데이션/계획) */}
      <div className="flex flex-col gap-[6px] rounded-[18px] bg-[linear-gradient(147deg,#4e68b0_0%,var(--color-logo-navy)_74%)] px-5 py-[18px] text-white">
        <div className="flex items-center justify-between">
          <p className="text-[13px] leading-[1.3] font-bold text-white/85">월 구독</p>
          <span className="rounded-md bg-white/18 px-2 py-[3px] text-[11px] leading-[1.3] font-bold">
            상태 예시
          </span>
        </div>
        <p className="text-xl leading-[1.35] font-bold tracking-[-0.4px]">요금 안내 예정</p>
        <p className="text-xs leading-[1.55] text-white/82">
          요금과 이용 범위는 확정 후 안내해요.
          <br />이 화면은 실제 결제 상태가 아닌 예시예요.
        </p>
      </div>

      <MenuList items={settingsMenu} />

      <MenuList items={subscriptionMenu} />

      <p className="rounded-[14px] bg-cool px-4 py-[14px] text-xs leading-[1.55] text-sub">
        구독이 끝나도 자료와 기록은 남아요.
        <br />새 AI 학습·문제 생성·설명 세션은 이용할 수 없어요.
      </p>

      <MenuList items={accountMenu} />
    </Screen>
  )
}
