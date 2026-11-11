import ApiState from '@/components/ApiState'
import { studyUrl } from '@/utils/studyModel'
import { Link } from 'react-router-dom'
import iconRight from '@/assets/icons/right-primary.svg'
import iconDot from '@/assets/icons/dot-secondary.svg'
import iconRightMuted from '@/assets/icons/right-muted-16.svg'
import iconAward from '@/assets/icons/award-muted.svg'
import { USE_MOCK } from '@/api/client'
import { Divider } from '@/components/Card'
import Chip from '@/components/Chip'
import Screen from '@/components/Screen'
import { useSessionRecords, useWeaknesses } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { toPercent } from '@/utils/format'

// 더미 (목 모드에서 표시) · 주간 통계와 재설명 성장은 아직 API 가 없어 목 모드에서만 보여요
const weekly = [
  ['4개', '읽은 개념'],
  ['20문제', '푼 문제'],
  ['3회', '마친 설명'],
]

const DUMMY_WEAK = [
  { id: 'w1', title: '현재완료', desc: '과거 시점 부사 사용 · 2회' },
  { id: 'w2', title: '시제의 기초', desc: 'since와 for 구분 · 2회' },
]

const DUMMY_RECENT = {
  id: null,
  chip: '오늘 · 첫 설명 완료',
  title: '현재완료 · 설명률 58%',
  note: '재설명 전이에요.',
  linkLabel: '약점 리포트 이어보기',
  to: '/report',
}

const TREND = { improving: '좋아지는 중', stable: '변화 없음', declining: '주의 필요', unknown: '' }
const SESSION_STATUS = {
  active: '설명 중',
  report_pending: '리포트 생성 중',
  completed: '설명 완료',
  abandoned: '중단',
}

function toWeak(weaknesses) {
  return weaknesses.map((w) => ({
    id: w.concept_id,
    versionId: w.concept_version_id,
    title: w.concept_name,
    desc: [
      w.latest_coverage !== null && `설명률 ${toPercent(w.latest_coverage)}%`,
      `오답 ${w.incorrect_attempts}회`,
      `설명 ${w.teachback_count}회`,
      TREND[w.trend],
    ]
      .filter(Boolean)
      .join(' · '),
  }))
}

function toRecent(session, weaknesses = []) {
  if (!session) return null
  const started = new Date(session.started_at)
  const isToday = started.toDateString() === new Date().toDateString()
  const name = weaknesses.find((w) => w.concept_id === session.concept_id)?.concept_name
  const done = session.status === 'completed'
  return {
    id: session.id,
    chip: `${isToday ? '오늘' : `${started.getMonth() + 1}월 ${started.getDate()}일`} · ${SESSION_STATUS[session.status]}`,
    title: name ?? '최근 설명',
    note: done ? '리포트를 확인하고 다시 설명해 보세요.' : null,
    linkLabel: done
      ? '약점 리포트 보기'
      : session.status === 'active'
        ? '설명 이어가기'
        : session.status === 'report_pending'
          ? '리포트 상태 확인'
          : null,
    to: studyUrl(
      done ? '/report' : session.status === 'report_pending' ? '/teach/analyzing' : '/teach',
      { session: session.id },
    ),
  }
}

// 15 기록
export default function RecordsPage() {
  const setIds = useStudyStore((s) => s.setIds)
  const weaknesses = useWeaknesses()
  const sessions = useSessionRecords()

  const weak = USE_MOCK ? DUMMY_WEAK : toWeak(weaknesses.data ?? [])
  const recent = USE_MOCK ? DUMMY_RECENT : toRecent(sessions.data?.[0], weaknesses.data)

  return (
    <Screen header="app" tabs className="gap-[18px] pb-5">
      {!USE_MOCK && (weaknesses.isError || sessions.isError) && (
        <ApiState query={weaknesses.isError ? weaknesses : sessions} />
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-[1.35] font-bold tracking-[-0.72px]">
          설명할수록 선명해지는 실력
        </h1>
        <p className="text-sm leading-[1.4] tracking-[-0.14px] text-sub">
          차곡차곡 쌓인 나의 학습 기록
        </p>
      </div>

      {USE_MOCK && (
        <>
          {/* 이번 주 통계 (그라데이션/기록) */}
          <div className="flex flex-col gap-[14px] rounded-[18px] bg-[linear-gradient(151deg,#5f8ff5_0%,var(--color-secondary)_74%)] px-5 py-[18px] text-white">
            <p className="text-[13px] leading-[1.3] font-bold text-white/85">이번 주에 쌓은 공부</p>
            <div className="flex items-center">
              {weekly.map(([v, k], i) => (
                <div key={k} className="flex flex-1 items-center">
                  {i > 0 && <span className="h-8 w-px bg-white/30" />}
                  <div className="flex flex-1 flex-col items-center">
                    <span className="text-[22px] leading-[1.25] font-bold tracking-[-0.44px]">
                      {v}
                    </span>
                    <span className="text-xs leading-[1.3] text-white/82">{k}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 재설명 성장 */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Chip>이전 학습 · 재설명 완료</Chip>
              <span className="text-xs leading-[1.3] text-sub">시제의 기초 · 11월 2일</span>
            </div>
            <p className="flex items-baseline gap-[10px] pt-1 leading-[1.2] font-bold">
              <span className="text-[22px] tracking-[-0.44px] text-muted">58%</span>
              <span className="text-base font-medium text-muted">→</span>
              <span className="text-[30px] tracking-[-0.6px] text-primary">83%</span>
            </p>
            <div className="flex flex-col gap-[6px]">
              <div className="h-[6px] overflow-hidden rounded-full bg-cool">
                <div className="h-full w-[58%] rounded-full bg-muted" />
              </div>
              <div className="h-[6px] overflow-hidden rounded-full bg-cool">
                <div className="h-full w-[83%] rounded-full bg-primary" />
              </div>
            </div>
            <p className="text-[13px] leading-[1.4] font-medium">
              첫 설명 → 완료한 재설명 · 25%p 증가
            </p>
            <Link
              to="/report"
              className="flex items-center gap-[2px] text-[13px] leading-[1.4] font-bold text-primary"
            >
              두 설명과 확인 항목 비교하기
              <img src={iconRight} alt="" className="size-[14px]" />
            </Link>
          </section>

          <Divider />
        </>
      )}

      {/* 최근 설명 */}
      {recent && (
        <>
          <section className="flex flex-col gap-[6px]">
            <div>
              <Chip tone="cool">{recent.chip}</Chip>
            </div>
            <p className="text-base leading-[1.4] font-bold tracking-[-0.16px]">{recent.title}</p>
            <p className="flex items-center gap-[6px] text-[13px] leading-[1.4]">
              {recent.note && <span className="text-sub">{recent.note}</span>}
              {recent.linkLabel && (
                <Link
                  to={recent.to}
                  onClick={() => recent.id && setIds({ sessionId: recent.id })}
                  className="flex items-center gap-[2px] font-bold text-primary"
                >
                  {recent.linkLabel}
                  <img src={iconRight} alt="" className="size-[14px]" />
                </Link>
              )}
            </p>
          </section>

          <Divider />
        </>
      )}

      {/* 자주 놓치는 개념 */}
      <section>
        <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">자주 놓치는 개념</h2>
        {weak.length === 0 && (
          <p className="py-3 text-[13px] leading-[1.5] text-sub">
            {weaknesses.isLoading
              ? '불러오는 중이에요…'
              : '아직 기록이 없어요. 문제를 풀고 설명해 보세요.'}
          </p>
        )}
        <ul>
          {weak.map((w) => (
            <li key={w.id}>
              <Link
                to={USE_MOCK ? '/unit' : studyUrl('/teach/prepare', { concept: w.versionId })}
                className="flex items-center gap-[10px] py-3"
              >
                <img src={iconDot} alt="" className="size-[6px]" />
                <span className="flex flex-1 flex-col leading-[1.4]">
                  <span className="text-sm font-bold">{w.title}</span>
                  <span className="text-xs text-sub">{w.desc}</span>
                </span>
                <img src={iconRightMuted} alt="" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        to="/records/verify"
        className="flex items-center gap-3 rounded-[14px] bg-cool px-4 py-[14px]"
      >
        <img src={iconAward} alt="" className="size-5" />
        <span className="flex flex-1 flex-col gap-[2px]">
          <span className="flex items-center gap-[6px]">
            <span className="text-sm leading-[1.4] font-bold">점수 인증하기</span>
            <Chip tone="primary">시험 종료</Chip>
          </span>
          <span className="text-xs leading-[1.4] text-sub">
            성적표를 올리면 검수 후 인증 표시가 붙어요.
          </span>
        </span>
      </Link>
    </Screen>
  )
}
