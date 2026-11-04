import { useQuery } from '@tanstack/react-query'
import { getExample } from '@/api/example'

// React Query 커스텀 훅 예시
export default function useExample() {
  return useQuery({ queryKey: ['example'], queryFn: getExample })
}
