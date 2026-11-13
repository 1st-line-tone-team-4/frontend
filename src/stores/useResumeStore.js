import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 첫 화면 '이어서 하기' 대상 화면 → 버튼 아래에 보여줄 이름
// 업로드 · 개념 확인(시작 단계), 분석 대기(/teach/analyzing)는 다시 열면 안 되는 화면이라 넣지 않아요
export const RESUMABLE = {
  '/today': '오늘 학습',
  '/plan': '학습 계획',
  '/study': '개념 학습',
  '/quiz': '문제 만들기',
  '/quiz/advanced': '심화 문제 만들기',
  '/quiz/solve': '문제 풀기',
  '/quiz/result': '문제 결과',
  '/teach/prepare': '설명 준비',
  '/teach': '설명하기',
  '/report': '설명 리포트',
  '/materials': '내 자료',
  '/records': '학습 기록',
}

// 이 기기에서 마지막으로 공부하던 화면 (localStorage 'resume' · 새로 켜도 유지)
// state 는 화면 이동 때 넘긴 값(개념 이름, 푼 답 등)이라 같이 저장해야 그대로 열려요
export const useResumeStore = create(
  persist(
    (set) => ({
      last: null, // { path, label, state, savedAt }
      save: (last) => set({ last }),
      clear: () => set({ last: null }),
    }),
    { name: 'resume' },
  ),
)

// 저장 시각 → '방금 전' · 'n분 전' · 'n시간 전' · 'n일 전'
export function timeAgo(savedAt, now = Date.now()) {
  const min = Math.floor((now - savedAt) / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour / 24)}일 전`
}
