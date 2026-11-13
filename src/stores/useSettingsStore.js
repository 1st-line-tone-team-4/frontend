import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 알림 설정(A-20) · 앱 설정(A-21) · 음성 설명(A-05)에서 함께 쓰는 사용자 설정
export const useSettingsStore = create(
  persist(
    (set) => ({
      // 음성
      ttsEnabled: true, // 학생 질문을 음성으로 읽기
      ttsRate: 1, // 읽기 속도 0.8 ~ 1.4
      // 화면
      theme: '시스템',
      fontSize: '보통',
      // 알림
      notify: {
        study: true,
        studyTime: '20:00',
        d7: true,
        d3: true,
        d1: true,
        unfinished: true,
        report: true,
        verify: true,
        afterExam: true,
        marketing: false,
        quiet: false,
        quietFrom: '23:00',
        quietTo: '08:00',
      },
      marketingAgreedAt: null,
      // AI 생성 요청의 model_id (비어 있으면 .env.local 의 VITE_AI_MODEL_ID)
      // 월 구독(계약 1.4.0): AI 제공자 키는 서버가 관리하므로 앱에 키를 두지 않아요
      aiModelId: null,
      set: (patch) => set(patch),
      setNotify: (patch) => set((s) => ({ notify: { ...s.notify, ...patch } })),
    }),
    {
      name: 'settings',
      // v1: 예전 버전이 저장해 둔 aiKey 를 브라우저 저장소에서 지워요
      version: 1,
      migrate: (persisted) => {
        // eslint-disable-next-line no-unused-vars
        const { aiKey, ...rest } = persisted ?? {}
        return rest
      },
    },
  ),
)
