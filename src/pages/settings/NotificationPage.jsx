import { useEffect, useState } from 'react'
import { BellIcon } from '@/components/icons'
import { toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import { SettingsRow, SettingsSection } from '@/components/SettingsList'
import { useDday } from '@/hooks/useStudyApi'
import { useSettingsStore } from '@/stores/useSettingsStore'

const permission = () =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission

function TimeInput({ value, onChange, label }) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg bg-cool px-2 py-1 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-primary/30"
    />
  )
}

// A-20 알림 설정 · 스위치는 바로 저장
export default function NotificationPage() {
  const dday = useDday()
  const { notify, setNotify, marketingAgreedAt, set } = useSettingsStore()
  const [perm, setPerm] = useState(permission)

  useEffect(() => {
    const onFocus = () => setPerm(permission())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const save = (patch) => {
    setNotify(patch)
    toast('저장했어요')
  }
  const tg = (key) => ({ checked: notify[key], onChange: (v) => save({ [key]: v }) })

  const openDevice = async () => {
    if (perm === 'default') setPerm(await Notification.requestPermission())
    else toast('브라우저 · 기기 설정에서 이 사이트의 알림을 켜 주세요.')
  }

  return (
    <Screen header={{ title: '알림 설정', dday }} className="gap-6">
      {perm !== 'granted' && (
        <div className="flex items-center gap-3 rounded-2xl bg-error-soft px-4 py-[14px]">
          <span className="text-error">
            <BellIcon size={20} />
          </span>
          <p className="flex-1 text-[13px] leading-[1.5] font-medium text-ink">
            {perm === 'unsupported'
              ? '이 기기는 알림을 지원하지 않아요.'
              : '기기 설정에서 알림을 켜 주세요.'}
          </p>
          {perm !== 'unsupported' && (
            <button type="button" onClick={openDevice} className="text-[13px] font-bold text-error">
              설정 열기
            </button>
          )}
        </div>
      )}

      <SettingsSection title="학습 알림">
        <SettingsRow title="오늘 학습 알림" toggle={tg('study')} />
        <SettingsRow
          title="알림 시각"
          desc="알림을 받을 시각이에요"
          right={
            <TimeInput
              label="알림 시각"
              value={notify.studyTime}
              onChange={(v) => save({ studyTime: v })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="일정 알림">
        <SettingsRow title="시험 D-7" toggle={tg('d7')} />
        <SettingsRow title="시험 D-3" toggle={tg('d3')} />
        <SettingsRow title="시험 D-1" toggle={tg('d1')} />
        <SettingsRow
          title="오늘 계획 미완료"
          desc="밤 9시에 남은 학습을 알려줘요"
          toggle={tg('unfinished')}
        />
      </SettingsSection>

      <SettingsSection title="결과 알림">
        <SettingsRow title="약점 리포트 완료" toggle={tg('report')} />
        <SettingsRow title="점수 인증 결과" toggle={tg('verify')} />
        <SettingsRow title="시험 후 안내" toggle={tg('afterExam')} />
      </SettingsSection>

      <SettingsSection title="혜택 · 소식">
        <SettingsRow
          title="마케팅 정보 수신 동의"
          desc={marketingAgreedAt ? `동의 일자 ${marketingAgreedAt}` : '켜면 별도로 동의를 받아요'}
          toggle={{
            checked: notify.marketing,
            onChange: (v) => {
              if (
                v &&
                !window.confirm(
                  '마케팅 정보 수신에 동의할까요?\n이벤트 · 혜택 소식을 알림으로 보내 드려요.',
                )
              )
                return
              set({ marketingAgreedAt: v ? new Date().toLocaleDateString('ko-KR') : null })
              save({ marketing: v })
            },
          }}
        />
      </SettingsSection>

      <SettingsSection title="방해 금지 시간">
        <SettingsRow
          title="방해 금지"
          desc="이 시간에는 알림을 보내지 않아요"
          toggle={tg('quiet')}
        />
        {notify.quiet && (
          <SettingsRow
            title="시간"
            right={
              <span className="flex items-center gap-1 text-sm text-sub">
                <TimeInput
                  label="시작 시각"
                  value={notify.quietFrom}
                  onChange={(v) => save({ quietFrom: v })}
                />
                ~
                <TimeInput
                  label="종료 시각"
                  value={notify.quietTo}
                  onChange={(v) => save({ quietTo: v })}
                />
              </span>
            }
          />
        )}
      </SettingsSection>
    </Screen>
  )
}
