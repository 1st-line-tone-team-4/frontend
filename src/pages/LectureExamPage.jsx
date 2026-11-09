import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import iconBook from '@/assets/icons/book.svg'
import iconCalendar from '@/assets/icons/calendar-sm.svg'
import iconInfo from '@/assets/icons/info.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { Field, Input } from '@/components/Field'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

function formatDday(days) {
  if (days === 0) return 'D-Day'
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

// 02-2 선택한 강의 · 시험 선택
export default function LectureExamPage() {
  const { state } = useLocation()
  const lecture = state?.lecture
  const [examDate, setExamDate] = useState(getLocalDateString())
  const dday = formatDday(getDday(examDate))

  return (
    <Screen
      header={{ title: '강의 검색', dday }}
      bottom={
        <>
          <BottomNote>개인 파일 업로드 없이 계속할 수 있어요</BottomNote>
          <Button to="/concepts">시험 선택하고 개념 확인</Button>
        </>
      }
      className="gap-[18px]"
    >
      <PageTitle
        title="이제 시험을 선택해 주세요"
        desc="선택한 강의로 학습할 시험 정보를 알려주세요."
      />

      <Link
        to="/lectures"
        className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-[14px]"
      >
        <span className="flex items-center justify-between">
          <Chip tone="white">파일 없이 시작</Chip>
          <span className="text-xs leading-[1.3] font-bold text-primary">선택 완료</span>
        </span>
        <span className="flex items-center gap-3 pt-1">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white">
            <img src={iconBook} alt="" className="size-[19.2px]" />
          </span>
          <span className="flex flex-col gap-[2px] leading-[1.4]">
            <span className="text-[15px] font-bold tracking-[-0.15px]">
              {lecture?.title ?? '선택한 강의'}
            </span>
            <span className="text-xs text-sub">{lecture?.meta ?? '강의 정보를 확인해 주세요'}</span>
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-[14px]">
        <Field label="시험 이름">
          <Input defaultValue={lecture?.title ?? '선택한 강의'} />
        </Field>
        <div className="flex flex-col gap-[14px]">
          <Field label="과목">
            <Input defaultValue={lecture?.subject ?? '선택한 강의'} />
          </Field>
        </div>
        <Field label="시험 날짜">
          <Input
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
            suffix={<Chip>{dday}</Chip>}
          />
        </Field>
      </div>

      <div className="flex gap-[10px] rounded-[14px] bg-cool px-4 py-[14px]">
        <img src={iconInfo} alt="" className="size-[18px] shrink-0" />
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">
            다음은 개념 확인이에요
          </p>
          <p className="text-[13px] leading-[1.5] text-sub">
            선택한 강의의 개념을 확인하고 내 시험 범위로 정해 주세요.
          </p>
        </div>
      </div>
    </Screen>
  )
}
