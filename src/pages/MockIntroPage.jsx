import Button from '@/components/Button'
import { ClockIcon, FlagIcon, GridIcon, SparkIcon } from '@/components/icons'
import Screen, { PageTitle } from '@/components/Screen'
import { MOCK_EXAM } from '@/data/flow'
import { useDday } from '@/hooks/useStudyApi'

export const MOCK_SAVE_KEY = 'mock-exam-progress'
const loadProgress = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_SAVE_KEY))
  } catch {
    return null
  }
}

// A-09 모의고사 안내
export default function MockIntroPage() {
  const dday = useDday()
  const saved = loadProgress()
  const conditions = [
    [GridIcon, '범위', `강의자료 전체 · 확정 개념 ${MOCK_EXAM.concepts}개`],
    [FlagIcon, '문항 수', `${MOCK_EXAM.count}문제`],
    [ClockIcon, '제한 시간', `${MOCK_EXAM.minutes}분`],
    [SparkIcon, '난이도', '하 · 중 · 상 혼합'],
  ]

  return (
    <Screen
      header={{ title: '모의고사', dday }}
      bottom={
        <>
          {saved && (
            <Button to="/mock/solve?resume=1" variant="secondary">
              이어서 풀기 · {saved.index + 1}번부터
            </Button>
          )}
          <Button to="/mock/solve" onClick={() => localStorage.removeItem(MOCK_SAVE_KEY)}>
            모의고사 시작
          </Button>
        </>
      }
      className="gap-6"
    >
      <PageTitle
        eyebrow="마지막 학습일"
        title="실전처럼 풀어봐요"
        desc="시험 전, 배운 개념 전체를 한 번에 점검해요."
      />

      <ul className="grid grid-cols-2 gap-2">
        {conditions.map(([Icon, k, v]) => (
          <li key={k} className="flex flex-col gap-2 rounded-2xl bg-cool p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-primary">
              <Icon size={16} />
            </span>
            <span className="text-xs font-bold text-sub">{k}</span>
            <span className="text-[15px] leading-[1.4] font-bold">{v}</span>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2 rounded-2xl border border-line p-4">
        <p className="text-sm font-bold">규칙</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.6] text-sub">
          <li>풀이 중에는 정답과 해설이 보이지 않아요.</li>
          <li>중간에 나가도 이어서 풀 수 있어요.</li>
          <li>시간이 끝나면 자동으로 제출돼요.</li>
        </ul>
      </section>

      {MOCK_EXAM.history.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm font-bold">지난 모의고사</p>
          {MOCK_EXAM.history.map((h) => (
            <div
              key={h.date}
              className="flex items-center justify-between rounded-xl bg-cool px-4 py-3 text-sm"
            >
              <span className="text-sub">{h.date}</span>
              <span className="font-bold">
                {h.score} / {h.total}
              </span>
            </div>
          ))}
        </section>
      )}
    </Screen>
  )
}
