import { Link } from 'react-router-dom'
import iconBook from '@/assets/icons/book.svg'
import iconRight from '@/assets/icons/right-primary.svg'
import iconCalendar from '@/assets/icons/calendar-sm.svg'
import iconInfo from '@/assets/icons/info.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { Field, Input } from '@/components/Field'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'

// 02-2 선택한 강의 · 시험 선택
export default function LectureExamPage() {
  return (
    <Screen
      header={{ title: '강의 검색', dday: 'D-5' }}
      bottom={
        <>
          <BottomNote>개인 파일 업로드 없이 계속할 수 있어요</BottomNote>
          <Button to="/concepts">시험 선택하고 개념 확인</Button>
        </>
      }
      className="gap-[18px]"
    >
      <PageTitle title="이제 시험을 선택해 주세요" desc="선택한 강의로 학습할 시험 정보를 알려주세요." />

      <Link to="/lectures" className="flex flex-col gap-[6px] rounded-[14px] bg-cool px-4 py-[14px]">
        <span className="flex items-center justify-between">
          <Chip tone="white">파일 없이 시작</Chip>
          <span className="text-xs leading-[1.3] font-bold text-primary">선택 완료</span>
        </span>
        <span className="flex items-center gap-3 pt-1">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white">
            <img src={iconBook} alt="" className="size-[19.2px]" />
          </span>
          <span className="flex flex-col gap-[2px] leading-[1.4]">
            <span className="text-[15px] font-bold tracking-[-0.15px]">토익 · 현재완료와 시제</span>
            <span className="text-xs text-sub">샘플 강의 · 개념 8개</span>
          </span>
        </span>
        <span className="flex items-center gap-[2px] pt-1 text-[13px] leading-[1.4] font-bold text-primary">
          다른 강의 선택
          <img src={iconRight} alt="" className="size-[14px]" />
        </span>
      </Link>

      <div className="flex flex-col gap-[14px]">
        <Field label="시험 이름">
          <Input defaultValue="토익 정기시험" />
        </Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="과목">
            <Input defaultValue="영어" />
          </Field>
          <Field label="시험 종류">
            <Input defaultValue="정기시험" />
          </Field>
        </div>
        <Field label="시험 날짜">
          <Input defaultValue="2026년 11월 8일" icon={iconCalendar} />
        </Field>
        <div>
          <Chip>D-5</Chip>
        </div>
      </div>

      <div className="flex gap-[10px] rounded-[14px] bg-cool px-4 py-[14px]">
        <img src={iconInfo} alt="" className="size-[18px] shrink-0" />
        <div className="flex flex-col gap-[2px]">
          <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">다음은 개념 확인이에요</p>
          <p className="text-[13px] leading-[1.5] text-sub">선택한 강의의 개념 8개를 확인하고 내 시험 범위로 정해 주세요.</p>
        </div>
      </div>
    </Screen>
  )
}
