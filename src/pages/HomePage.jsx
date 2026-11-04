import useExample from '@/hooks/useExample'
import { useAuthStore } from '@/stores/useAuthStore'

// 세팅 확인용 페이지 · 확인이 끝나면 지우고 실제 화면을 만드세요
export default function HomePage() {
  const { data, isLoading, isError } = useExample()
  const { accessToken, setToken, logout } = useAuthStore()

  const rows = [
    ['React + Vite', '실행 중'],
    ['Tailwind CSS', '이 화면의 스타일'],
    ['React Router', '아래 탭 이동'],
    ['axios + React Query', isLoading ? '불러오는 중…' : isError ? '실패' : data?.message],
    ['Zustand', accessToken ? `토큰: ${accessToken}` : '토큰 없음'],
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">개발 환경 세팅 완료</h1>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between px-4 py-3 text-sm">
            <span className="font-medium">{k}</span>
            <span className="text-gray-500">{v}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setToken('test-token')}
          className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white"
        >
          토큰 저장
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex-1 rounded-lg bg-gray-100 py-3 text-sm font-bold text-gray-600"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
