import Button from './Button'

/**
 * API 조회 중/실패/빈 데이터 안내 (실제 API 모드에서만 보여요)
 * - query: React Query 결과 · empty: 데이터가 없을 때 문구 · action: { label, to } 빈 화면 버튼
 */
export default function ApiState({ query, empty = '아직 데이터가 없어요.', action }) {
  let message = empty
  if (query?.isLoading) message = '불러오는 중이에요…'
  else if (query?.isError) message = query.error?.message ?? '데이터를 불러오지 못했어요.'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-sm leading-[1.55] whitespace-pre-line text-sub">{message}</p>
      {query?.isError && (
        <Button variant="secondary" className="w-auto px-6" onClick={() => query.refetch()}>
          다시 시도
        </Button>
      )}
      {!query?.isLoading && !query?.isError && action && (
        <Button to={action.to} className="w-auto px-6">
          {action.label}
        </Button>
      )}
    </div>
  )
}
