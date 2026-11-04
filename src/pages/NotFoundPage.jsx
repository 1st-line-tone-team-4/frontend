import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <Link to="/" className="text-blue-600 underline">
        홈으로
      </Link>
    </div>
  )
}
