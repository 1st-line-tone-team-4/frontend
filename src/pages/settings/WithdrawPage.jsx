import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/Button'
import Checkbox from '@/components/Checkbox'
import Logo from '@/components/Logo'
import { Modal } from '@/components/Overlay'
import Screen, { PageTitle } from '@/components/Screen'
import { useDday } from '@/hooks/useStudyApi'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

const DELETED = ['올린 자료와 개념', '학습 기록과 리포트', '점수 인증과 배지', '계정 정보']
const REASONS = [
  '시험이 끝났어요',
  '기대한 기능이 없어요',
  '사용하기 어려워요',
  '다른 서비스를 써요',
  '기타',
]

// A-22 회원 탈퇴
export default function WithdrawPage() {
  const navigate = useNavigate()
  const dday = useDday()
  const logout = useAuthStore((s) => s.logout)
  const resetStudy = useStudyStore((s) => s.reset)
  const [reason, setReason] = useState(null)
  const [etc, setEtc] = useState('')
  const [checked, setChecked] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <Screen
        bottom={<Button to="/">처음으로</Button>}
        className="items-center justify-center gap-4 text-center"
      >
        <Logo variant="full" className="scale-75" />
        <h1 className="text-[22px] font-bold">그동안 이용해 주셔서 감사해요</h1>
        <p className="text-sm text-sub">언제든 다시 설명하러 와 주세요.</p>
      </Screen>
    )
  }

  return (
    <Screen
      header={{ title: '회원 탈퇴', dday }}
      bottom={
        <div className="flex w-full gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/settings/account')}
          >
            취소
          </Button>
          <Button
            variant={checked ? 'primary' : 'disabled'}
            className={`flex-1 ${checked ? '!bg-error' : ''}`}
            onClick={() => setConfirm(true)}
          >
            탈퇴하기
          </Button>
        </div>
      }
      className="gap-6"
    >
      <PageTitle
        title="정말 탈퇴할까요?"
        desc="탈퇴하면 아래 정보가 모두 삭제되고 되돌릴 수 없어요."
      />

      <ul className="flex flex-col gap-2 rounded-2xl bg-error-soft/60 p-4">
        {DELETED.map((d) => (
          <li key={d} className="flex items-center gap-2 text-sm font-medium">
            <span className="size-[6px] rounded-full bg-error" />
            {d}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 rounded-2xl border border-line p-4">
        <p className="text-sm font-bold">구독 중이에요</p>
        <p className="text-[13px] leading-[1.55] text-sub">
          구독을 먼저 해지해 주세요. 남은 기간 처리는 안내 예정이에요.
        </p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="self-start text-[13px] font-bold text-primary"
        >
          구독 해지로 가기 →
        </button>
      </div>

      <p className="rounded-2xl bg-cool p-4 text-[13px] leading-[1.55] text-sub">
        공개한 문제는 처리 방식이 정해지면 안내해 드려요. 재가입해도 이전 기록은 복구되지 않아요.
      </p>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-bold">떠나는 이유를 알려주세요 (선택)</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
              className={`rounded-full px-3 py-[7px] text-[13px] font-bold ${reason === r ? 'bg-ink text-white' : 'bg-cool text-sub'}`}
            >
              {r}
            </button>
          ))}
        </div>
        {reason === '기타' && (
          <textarea
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
            rows={3}
            placeholder="자유롭게 적어 주세요"
            className="w-full resize-none rounded-xl bg-cool px-[14px] py-3 text-[15px] outline-none placeholder:text-muted"
          />
        )}
      </section>

      <label className="flex items-center gap-3 text-sm font-bold">
        <Checkbox checked={checked} onChange={setChecked} />위 내용을 확인했어요
      </label>

      <Modal
        open={confirm}
        danger
        title="탈퇴하면 되돌릴 수 없어요"
        desc="모든 자료와 기록이 삭제돼요. 정말 탈퇴할까요?"
        confirmLabel="탈퇴하기"
        onConfirm={() => {
          logout()
          resetStudy()
          sessionStorage.clear()
          setConfirm(false)
          setDone(true)
        }}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  )
}
