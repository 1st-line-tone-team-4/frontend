import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@/components/Button'
import Checkbox from '@/components/Checkbox'
import Logo from '@/components/Logo'
import { toast } from '@/components/Overlay'
import Screen from '@/components/Screen'

// 소셜 로그인 종류는 미결 → 버튼만 시안으로 둬요
const SOCIAL = [
  { id: 'kakao', label: '카카오로 계속하기', cls: 'bg-[#FEE500] text-[#191919]' },
  { id: 'google', label: 'Google로 계속하기', cls: 'border border-line bg-white text-ink' },
  { id: 'apple', label: 'Apple로 계속하기', cls: 'bg-black text-white' },
]

// A-18 로그인 · 가입 · ?next=/upload 처럼 원래 가려던 화면으로 돌아가요
export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/upload'
  const [agree, setAgree] = useState({ terms: false, privacy: false })
  const all = agree.terms && agree.privacy

  const go = () => {
    if (!all) return toast('약관과 개인정보 처리에 동의해 주세요.')
    toast('로그인 연동은 준비 중이에요. 시안 흐름으로 이어갈게요.')
    navigate(next)
  }

  return (
    <Screen className="items-center justify-between gap-8 pt-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo variant="full" className="scale-75" />
        <p className="text-[22px] leading-[1.4] font-bold tracking-[-0.44px]">
          내 자료와 기록을
          <br />
          안전하게 저장해요
        </p>
        <p className="text-sm text-sub">설명할 수 있을 때, 진짜 내 실력</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {SOCIAL.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={go}
            className={`h-[52px] rounded-[14px] text-[15px] font-bold ${s.cls}`}
          >
            {s.label}
          </button>
        ))}
        <Button variant="secondary" onClick={go}>
          이메일로 계속하기
        </Button>

        <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-cool p-4">
          <label className="flex items-center gap-3 text-sm font-bold">
            <Checkbox checked={all} onChange={(v) => setAgree({ terms: v, privacy: v })} />
            전체 동의
          </label>
          <hr className="border-line" />
          {[
            ['terms', '[필수] 이용약관 동의'],
            ['privacy', '[필수] 개인정보 수집 · 이용 동의'],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 text-[13px] text-sub">
              <Checkbox checked={agree[k]} onChange={(v) => setAgree((a) => ({ ...a, [k]: v }))} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </Screen>
  )
}
