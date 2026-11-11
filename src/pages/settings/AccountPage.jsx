import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/Button'
import { Field, Input } from '@/components/Field'
import { BottomSheet, Modal, toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import { SettingsRow, SettingsSection } from '@/components/SettingsList'
import { USE_MOCK } from '@/api/client'
import { useDday, useMe } from '@/hooks/useStudyApi'

// A-19 계정 설정
export default function AccountPage() {
  const navigate = useNavigate()
  const dday = useDday()
  const me = useMe()
  const [name, setName] = useState(USE_MOCK ? '지민' : (me.data?.display_name ?? ''))
  const [draftName, setDraftName] = useState(name)
  const [goal, setGoal] = useState({ exam: '토익 정기시험', date: '2026-11-08', score: '900' })
  const [draftGoal, setDraftGoal] = useState(goal)
  const [sheet, setSheet] = useState(null) // 'profile' | 'password' | 'goal'
  const [confirmReplan, setConfirmReplan] = useState(false)
  const [pw, setPw] = useState({ now: '', next: '' })
  const email = USE_MOCK ? 'jimin@example.com' : (me.data?.email ?? '')

  const saveGoal = () => {
    if (draftGoal.date !== goal.date) return setConfirmReplan(true)
    setGoal(draftGoal)
    setSheet(null)
    toast('저장했어요')
  }

  if (!USE_MOCK) {
    return (
      <Screen header={{ title: '계정 설정', dday }} className="gap-6">
        <SettingsSection title="로그인 정보">
          <SettingsRow title="이름" value={me.data?.display_name || '등록된 이름 없음'} />
          <SettingsRow title="이메일 주소" value={email || '등록된 이메일 없음'} />
          <SettingsRow title="로그인 방법" value="외부 인증 제공자" />
        </SettingsSection>
        <p className="rounded-xl bg-cool p-4 text-sm text-sub">
          프로필과 비밀번호 변경은 현재 API에서 지원하지 않아요. 비밀번호는 사용하는 인증 제공자에서
          관리해 주세요.
        </p>
        <Button to="/plan">내 시험 목표와 계획 보기</Button>
        <Button to="/login" variant="secondary">
          AI 연결 설정
        </Button>
        <Button to="/settings/withdraw" variant="secondary">
          회원 탈퇴 지원 안내
        </Button>
      </Screen>
    )
  }

  return (
    <Screen header={{ title: '계정 설정', dday }} className="gap-6">
      <div className="flex items-center gap-[14px]">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">
          {name.slice(0, 1)}
        </span>
        <div className="flex flex-1 flex-col">
          <p className="text-[17px] font-bold">{name}님</p>
          <p className="text-[13px] text-sub">{email}</p>
        </div>
        <Button
          variant="secondary"
          className="h-9 w-auto px-4 text-sm"
          onClick={() => setSheet('profile')}
        >
          변경
        </Button>
      </div>

      <SettingsSection title="로그인 정보">
        <SettingsRow title="가입 방법" value="이메일" />
        <SettingsRow title="이메일 주소" value={email} />
        <SettingsRow
          title="비밀번호 변경"
          desc="이메일 가입자만 변경할 수 있어요"
          onClick={() => setSheet('password')}
        />
      </SettingsSection>

      <SettingsSection
        title="목표 시험 정보"
        desc="목표 점수는 문제은행 추천 순서를 정하는 데 써요."
      >
        <SettingsRow title="시험 이름" value={goal.exam} />
        <SettingsRow title="시험일" value={goal.date.replaceAll('-', '.')} />
        <SettingsRow title="목표 점수" value={goal.score ? `${goal.score}점` : '선택 입력'} />
        <SettingsRow
          title="시험 정보 수정"
          onClick={() => {
            setDraftGoal(goal)
            setSheet('goal')
          }}
        />
      </SettingsSection>

      <button
        type="button"
        onClick={() => navigate('/settings/withdraw')}
        className="mt-6 self-center text-xs text-muted underline"
      >
        회원 탈퇴
      </button>

      <BottomSheet
        open={sheet === 'profile'}
        title="프로필 변경"
        onClose={() => setSheet(null)}
        footer={
          <Button
            onClick={() => {
              setName(draftName.trim() || name)
              setSheet(null)
              toast('저장했어요')
            }}
          >
            저장
          </Button>
        }
      >
        <div className="flex justify-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-2xl font-bold text-primary">
            {draftName.slice(0, 1)}
          </span>
        </div>
        <Field label="이름" strong>
          <Input value={draftName} maxLength={12} onChange={(e) => setDraftName(e.target.value)} />
        </Field>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'password'}
        title="비밀번호 변경"
        onClose={() => setSheet(null)}
        footer={
          <Button
            variant={pw.now && pw.next.length >= 8 ? 'primary' : 'disabled'}
            onClick={() => {
              setPw({ now: '', next: '' })
              setSheet(null)
              toast('비밀번호를 바꿨어요')
            }}
          >
            변경하기
          </Button>
        }
      >
        <Field label="현재 비밀번호" strong>
          <Input
            type="password"
            autoComplete="current-password"
            value={pw.now}
            onChange={(e) => setPw((p) => ({ ...p, now: e.target.value }))}
          />
        </Field>
        <Field label="새 비밀번호 (8자 이상)" strong>
          <Input
            type="password"
            autoComplete="new-password"
            value={pw.next}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
        </Field>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'goal'}
        title="목표 시험 정보"
        onClose={() => setSheet(null)}
        footer={<Button onClick={saveGoal}>저장</Button>}
      >
        <Field label="시험 이름" strong>
          <Input
            value={draftGoal.exam}
            onChange={(e) => setDraftGoal((g) => ({ ...g, exam: e.target.value }))}
          />
        </Field>
        <Field label="시험일" strong>
          <Input
            type="date"
            value={draftGoal.date}
            onChange={(e) => setDraftGoal((g) => ({ ...g, date: e.target.value }))}
          />
        </Field>
        <Field label="목표 점수 (선택)" strong>
          <Input
            inputMode="numeric"
            value={draftGoal.score}
            onChange={(e) =>
              setDraftGoal((g) => ({ ...g, score: e.target.value.replace(/\D/g, '') }))
            }
          />
        </Field>
      </BottomSheet>

      <Modal
        open={confirmReplan}
        title="코스를 다시 맞출까요?"
        desc="시험일이 바뀌면 남은 기간에 맞춰 학습 계획을 다시 만들어요."
        confirmLabel="다시 맞추기"
        onConfirm={() => {
          setGoal(draftGoal)
          setConfirmReplan(false)
          setSheet(null)
          navigate('/plan')
        }}
        onClose={() => setConfirmReplan(false)}
      />
    </Screen>
  )
}
