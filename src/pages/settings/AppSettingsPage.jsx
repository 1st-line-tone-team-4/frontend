import { useEffect, useState } from 'react'
import { Segment } from '@/components/Field'
import { toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import { SettingsRow, SettingsSection } from '@/components/SettingsList'
import { getMicPermission, speak, speechSupport } from '@/hooks/useSpeech'
import { useDday } from '@/hooks/useStudyApi'
import { useSettingsStore } from '@/stores/useSettingsStore'

const MIC_LABEL = { granted: '허용됨', denied: '거부됨', prompt: '묻기 전', unknown: '확인 불가' }
const RATES = [0.8, 1, 1.2, 1.4]

// A-21 앱 설정 · 설명 언어는 한국어로 고정이라 언어 항목은 두지 않아요
export default function AppSettingsPage() {
  const dday = useDday()
  const { theme, fontSize, ttsEnabled, ttsRate, set } = useSettingsStore()
  const [mic, setMic] = useState('unknown')

  useEffect(() => {
    getMicPermission().then(setMic)
  }, [])

  const save = (patch) => {
    set(patch)
    toast('저장했어요')
  }

  return (
    <Screen header={{ title: '앱 설정', dday }} className="gap-6">
      <SettingsSection title="화면">
        <li className="flex flex-col gap-2 py-[14px]">
          <span className="text-[15px] font-medium">화면 모드</span>
          <Segment
            options={['시스템', '밝게', '어둡게']}
            value={theme}
            onChange={(v) => save({ theme: v })}
          />
        </li>
        <li className="flex flex-col gap-2 py-[14px]">
          <span className="text-[15px] font-medium">글자 크기</span>
          <Segment
            options={['작게', '보통', '크게']}
            value={fontSize}
            onChange={(v) => save({ fontSize: v })}
          />
        </li>
      </SettingsSection>

      <SettingsSection title="음성">
        <SettingsRow
          title="학생 질문을 음성으로 읽기"
          desc={
            speechSupport.synthesis
              ? '설명 중 민지의 질문을 소리로 들려줘요'
              : '이 브라우저는 음성 읽기를 지원하지 않아요'
          }
          toggle={{
            checked: ttsEnabled,
            onChange: (v) => save({ ttsEnabled: v }),
            disabled: !speechSupport.synthesis,
          }}
        />
        <li className="flex flex-col gap-2 py-[14px]">
          <span className="flex items-center justify-between text-[15px] font-medium">
            읽기 속도
            <button
              type="button"
              onClick={() => speak('잠깐만요! since랑 for는 어떻게 달라요?', { rate: ttsRate })}
              className="text-xs font-bold text-primary"
            >
              미리 듣기
            </button>
          </span>
          <Segment
            options={RATES.map((r) => `${r}x`)}
            value={`${ttsRate}x`}
            onChange={(v) => save({ ttsRate: Number.parseFloat(v) })}
          />
        </li>
        <SettingsRow
          title="마이크 권한"
          value={MIC_LABEL[mic]}
          onClick={() => toast('브라우저 주소창의 사이트 설정에서 마이크 권한을 바꿀 수 있어요.')}
        />
      </SettingsSection>

      <SettingsSection title="저장 공간">
        <SettingsRow
          title="임시 파일 지우기"
          desc="저장된 대화 초안과 모의고사 진행 상황을 지워요"
          onClick={() => {
            sessionStorage.clear()
            localStorage.removeItem('mock-exam-progress')
            toast('임시 파일을 지웠어요')
          }}
        />
      </SettingsSection>

      <SettingsSection title="정보">
        <SettingsRow title="이용약관" onClick={() => toast('문서 준비 중이에요')} />
        <SettingsRow title="개인정보처리방침" onClick={() => toast('문서 준비 중이에요')} />
        <SettingsRow title="오픈소스 라이선스" onClick={() => toast('문서 준비 중이에요')} />
        <SettingsRow title="고객센터 문의" onClick={() => toast('문의 채널 준비 중이에요')} />
        <SettingsRow title="앱 버전" value="0.1.0" />
      </SettingsSection>
    </Screen>
  )
}
