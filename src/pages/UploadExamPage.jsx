import { useRef, useState } from 'react'
import iconUpload from '@/assets/icons/upload-sm.svg'
import iconFile from '@/assets/icons/file.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheckCircle from '@/assets/icons/check-circle.svg'
import iconCalendar from '@/assets/icons/calendar-sm.svg'
import Button from '@/components/Button'
import Card, { Divider, SectionTitle } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Input, Select } from '@/components/Field'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'

const plan = [
  { day: '11/3 · 오늘 목표', range: 'p.1–8', today: true },
  { day: '11/4', range: 'p.9–16' },
  { day: '11/5', range: 'p.17–24' },
  { day: '11/6', range: 'p.25–32' },
  { day: '11/7 · 마지막 복습', range: '전체 복습' },
]

const summary = [
  ['총 페이지', '32페이지'],
  ['남은 기간', '5일 (11/3–11/7)'],
  ['최소 일일 목표', '7페이지'],
]

// 03 자료 업로드 · 시험 선택
export default function UploadExamPage() {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('토익 문법 정리.pdf')

  return (
    <Screen
      header={{ title: '강의자료 업로드' }}
      bottom={
        <>
          <BottomNote>
            올린 자료는 비공개예요.
            <br />
            개념 설명과 문제, 평가의 근거로만 사용돼요.
          </BottomNote>
          <Button to="/concepts">시험 선택하고 개념 확인</Button>
        </>
      }
      className="gap-5"
    >
      <PageTitle title={'파일 업로드 후\n시험을 선택해 주세요'} desc="업로드된 파일과 함께 시험 정보를 입력해 주세요." />

      <div className="flex flex-col gap-[10px]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-primary bg-primary-soft px-4 py-[14px] text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white">
            <img src={iconUpload} alt="" className="size-[17.28px]" />
          </span>
          <span className="flex-1 text-sm leading-[1.4] font-bold tracking-[-0.14px]">파일을 추가해보세요</span>
          <Chip tone="white">PDF · 텍스트 · 이미지</Chip>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,image/*"
          className="hidden"
          onChange={(e) => e.target.files[0] && setFileName(e.target.files[0].name)}
        />
        <div className="flex items-center gap-3 rounded-[14px] border border-line px-4 py-[14px]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-cool">
            <img src={iconFile} alt="" className="size-[19.2px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[1.4]">
            <span className="truncate text-[15px] font-bold tracking-[-0.15px]">{fileName}</span>
            <span className="text-xs text-sub">PDF · 32페이지 · 2.4 MB</span>
          </span>
          <Chip>
            <img src={iconCheck} alt="" className="size-[11px]" />
            업로드 완료
          </Chip>
        </div>
      </div>

      <Divider />

      <div className="flex flex-col gap-[14px]">
        <SectionTitle title="시험 정보를 입력해 주세요" />
        <Field label="시험 이름">
          <Input />
        </Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="과목">
            <Select options={['영어', '국어', '수학']} />
          </Field>
          <Field label="시험 종류">
            <Select options={['정기시험', '모의고사', '중간고사', '기말고사']} />
          </Field>
        </div>
        <Field label="시험 날짜">
          <Input defaultValue="2026년 11월 8일" icon={iconCalendar} />
        </Field>
      </div>

      <Divider />

      <div className="flex flex-col gap-[14px]">
        <SectionTitle
          title="하루 권장 학습량"
          desc="업로드 파일과 시험 날짜를 기준으로 계산했어요. 문제 풀이, 복습은 별도로 시간을 더 고려해 주세요."
        />
        <dl className="flex flex-col gap-[10px] rounded-[14px] bg-cool px-4 py-[14px] text-[13px] leading-[1.4]">
          {summary.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <dt className="text-sub">{k}</dt>
              <dd className="font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between pt-[2px]">
          <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">권장 학습안</p>
          <Chip>4일 학습 + 1일 복습</Chip>
        </div>
        <ul className="divide-y divide-line">
          {plan.map((p) => (
            <li
              key={p.day}
              className={`flex justify-between py-[10px] text-[13px] leading-[1.4] ${p.today ? 'font-bold text-primary' : ''}`}
            >
              <span>{p.day}</span>
              <span className="font-bold">{p.range}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-[1.5] text-sub">권장안은 4일 동안 8페이지씩 읽고 마지막 날은 전체 복습하는 방식이에요.</p>
      </div>

      <Button variant="secondary" onClick={() => fileRef.current?.click()}>
        파일 바꾸기
      </Button>

      <Card tone="gradient" className="rounded-[18px] p-[18px]">
        <div className="flex items-center gap-[10px]">
          <img src={iconCheckCircle} alt="" className="size-[22px]" />
          <div className="flex flex-col leading-[1.4]">
            <p className="text-base font-bold tracking-[-0.16px]">자료 분석이 완료됐어요</p>
            <p className="text-[13px] text-sub">개념별 근거 페이지까지 연결했어요</p>
          </div>
        </div>
      </Card>
    </Screen>
  )
}
