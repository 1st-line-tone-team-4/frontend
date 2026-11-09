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
      set: (patch) => set(patch),
      setNotify: (patch) => set((s) => ({ notify: { ...s.notify, ...patch } })),
    }),
    { name: 'settings' },
  ),
)
