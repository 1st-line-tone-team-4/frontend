import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import iconUpload from '@/assets/icons/upload-sm.svg'
import iconFile from '@/assets/icons/file.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheckCircle from '@/assets/icons/check-circle.svg'
import iconCalendar from '@/assets/icons/calendar-sm.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import Card, { Divider, SectionTitle } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Input, Select } from '@/components/Field'
import Screen, { BottomNote, PageTitle } from '@/components/Screen'
import { useCreateExamGoal, useMaterial, useUploadMaterial } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { fileBaseName, formatBytes, MIME_LABEL } from '@/utils/format'

// 더미 (목 모드에서 표시)
const DUMMY_FILE = { name: '토익 문법 정리.pdf', meta: 'PDF · 32페이지 · 2.4 MB', status: 'ready' }

const DUMMY_PLAN = [
  { day: '11/3 · 오늘 목표', range: 'p.1–8', today: true },
  { day: '11/4', range: 'p.9–16' },
  { day: '11/5', range: 'p.17–24' },
  { day: '11/6', range: 'p.25–32' },
  { day: '11/7 · 마지막 복습', range: '전체 복습' },
]

const DUMMY_SUMMARY = [
  ['총 페이지', '32페이지'],
  ['남은 기간', '5일 (11/3–11/7)'],
  ['최소 일일 목표', '7페이지'],
]

const ACCEPT = '.pdf,.txt,.png,.jpg,.jpeg'

const STATUS_CHIP = {
  upload_pending: '업로드 중',
  queued: '분석 대기',
  processing: '분석 중',
  ready: '업로드 완료',
  failed: '분석 실패',
}

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

// 시험 이름으로 명세의 exam_type 추정 (화면에 시험 종류 선택이 없어서)
function guessExamType(title) {
  if (/토익|toeic/i.test(title)) return 'toeic'
  if (/토플|toefl/i.test(title)) return 'toefl'
  if (/수능|입시|모의고사/.test(title)) return 'entrance_exam'
  return 'school_exam'
}

// 업로드 자료 페이지 수와 시험 날짜로 하루 권장 학습량 계산 (마지막 날은 전체 복습)
function buildReadingPlan(pageCount, examDate) {
  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.max(getDday(examDate), 1) // 시험 전날까지 학습
  const studyDays = Math.max(days - 1, 1)
  const perDay = Math.ceil(pageCount / studyDays)
  const end = new Date(today)
  end.setDate(today.getDate() + days - 1)

  const plan = []
  for (let i = 0; i < studyDays; i += 1) {
    const from = i * perDay + 1
    if (from > pageCount) break
    const to = Math.min((i + 1) * perDay, pageCount)
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    plan.push({
      day: i === 0 ? `${md(d)} · 오늘 목표` : md(d),
      range: `p.${from}–${to}`,
      today: i === 0,
    })
  }
  if (days > 1) plan.push({ day: `${md(end)} · 마지막 복습`, range: '전체 복습' })

  return {
    plan,
    summary: [
      ['총 페이지', `${pageCount}페이지`],
      ['남은 기간', `${days}일 (${md(today)}–${md(end)})`],
      ['최소 일일 목표', `${perDay}페이지`],
    ],
    chip: days > 1 ? `${plan.length - 1}일 학습 + 1일 복습` : '하루 학습',
    note:
      days > 1
        ? `권장안은 ${plan.length - 1}일 동안 ${perDay}페이지씩 읽고 마지막 날은 전체 복습하는 방식이에요.`
        : `오늘 ${pageCount}페이지를 모두 읽는 방식이에요.`,
  }
}

// 03 자료 업로드 · 시험 선택
export default function UploadExamPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileRef = useRef(null)
  const [mockFileName, setMockFileName] = useState(DUMMY_FILE.name)
  // null 이면 직접 입력 전 → 앞 화면의 시험 이름, 없으면 올린 파일명을 사용
  const [typedTitle, setTypedTitle] = useState(state?.examName || null)
  const [examDate, setExamDate] = useState(getLocalDateString())
  const dday = formatDday(getDday(examDate))

  const materialId = useStudyStore((s) => s.materialId)
  const material = useMaterial(materialId).data
  const upload = useUploadMaterial()
  const createGoal = useCreateExamGoal()

  // 목 모드는 더미, 실제 모드는 API 자료 정보
  const file = USE_MOCK
    ? { ...DUMMY_FILE, name: mockFileName }
    : material && {
        name: material.filename,
        meta: [
          MIME_LABEL[material.mime_type],
          material.page_count && `${material.page_count}페이지`,
          formatBytes(material.size_bytes),
        ]
          .filter(Boolean)
          .join(' · '),
        status: material.processing_status,
      }
  const title = typedTitle ?? fileBaseName(file?.name)
  const reading =
    !USE_MOCK && material?.page_count ? buildReadingPlan(material.page_count, examDate) : null
  const ready = file?.status === 'ready'

  const onPickFile = (e) => {
    const picked = e.target.files[0]
    if (!picked) return
    if (USE_MOCK) return setMockFileName(picked.name)
    upload.mutate(picked, { onError: (err) => alert(err.message) })
  }

  const onSubmit = () => {
    if (!USE_MOCK && !title.trim()) return alert('시험 이름을 입력해 주세요.')
    if (!USE_MOCK && !ready) return alert('자료 분석이 끝나면 다음으로 넘어갈 수 있어요.')
    createGoal.mutate(
      { title: title.trim(), exam_type: guessExamType(title), exam_date: examDate },
      { onSuccess: () => navigate('/concepts'), onError: (err) => alert(err.message) },
    )
  }

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
          <Button onClick={onSubmit} disabled={createGoal.isPending}>
            시험 선택하고 개념 확인
          </Button>
        </>
      }
      className="gap-5"
    >
      <PageTitle
        title={'파일 업로드 후\n시험을 선택해 주세요'}
        desc="업로드된 파일과 함께 시험 정보를 입력해 주세요."
      />

      <div className="flex flex-col gap-[10px]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-primary bg-primary-soft px-4 py-[14px] text-left"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-white">
            <img src={iconUpload} alt="" className="size-[17.28px]" />
          </span>
          <span className="flex-1 text-sm leading-[1.4] font-bold tracking-[-0.14px]">
            {upload.isPending ? '업로드 중이에요…' : '파일을 추가해보세요'}
          </span>
          <Chip tone="white">PDF · 텍스트 · 이미지</Chip>
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPickFile} />
        {file && (
          <div className="flex items-center gap-3 rounded-[14px] border border-line px-4 py-[14px]">
            <span className="flex size-10 items-center justify-center rounded-xl bg-cool">
              <img src={iconFile} alt="" className="size-[19.2px]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[1.4]">
              <span className="truncate text-[15px] font-bold tracking-[-0.15px]">{file.name}</span>
              <span className="text-xs text-sub">{file.meta}</span>
            </span>
            <Chip tone={file.status === 'failed' ? 'error' : 'primary'}>
              {ready && <img src={iconCheck} alt="" className="size-[11px]" />}
              {STATUS_CHIP[file.status]}
            </Chip>
          </div>
        )}
      </div>

      <Divider />

      <div className="flex flex-col gap-[14px]">
        <SectionTitle title="시험 정보를 입력해 주세요" />
        <Field label="시험 이름">
          <Input value={title} onChange={(e) => setTypedTitle(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-[14px]">
          <Field label="과목">
            <Select options={['영어', '국어', '수학', '기타']} />
          </Field>
        </div>
        <Field label="시험 날짜">
          <Input
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
            icon={iconCalendar}
            prefix={<Chip>{dday}</Chip>}
          />
        </Field>
      </div>

      {(USE_MOCK || reading) && (
        <>
          <Divider />

          <div className="flex flex-col gap-[14px]">
            <SectionTitle
              title="하루 권장 학습량"
              desc="업로드 파일과 시험 날짜를 기준으로 계산했어요. 문제 풀이, 복습은 별도로 시간을 더 고려해 주세요."
            />
            <dl className="flex flex-col gap-[10px] rounded-[14px] bg-cool px-4 py-[14px] text-[13px] leading-[1.4]">
              {(reading?.summary ?? DUMMY_SUMMARY).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-sub">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between pt-[2px]">
              <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">권장 학습안</p>
              <Chip>{reading?.chip ?? '4일 학습 + 1일 복습'}</Chip>
            </div>
            <ul className="divide-y divide-line">
              {(reading?.plan ?? DUMMY_PLAN).map((p) => (
                <li
                  key={p.day}
                  className={`flex justify-between py-[10px] text-[13px] leading-[1.4] ${p.today ? 'font-bold text-primary' : ''}`}
                >
                  <span>{p.day}</span>
                  <span className="font-bold">{p.range}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-[1.5] text-sub">
              {reading?.note ??
                '권장안은 4일 동안 8페이지씩 읽고 마지막 날은 전체 복습하는 방식이에요.'}
            </p>
          </div>
        </>
      )}

      <Button variant="secondary" onClick={() => fileRef.current?.click()}>
        파일 바꾸기
      </Button>

      {file && (
        <Card tone="gradient" className="rounded-[18px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <img src={iconCheckCircle} alt="" className="size-[22px]" />
            <div className="flex flex-col leading-[1.4]">
              <p className="text-base font-bold tracking-[-0.16px]">
                {ready
                  ? '자료 분석이 완료됐어요'
                  : file.status === 'failed'
                    ? '자료 분석에 실패했어요'
                    : '자료를 분석하고 있어요'}
              </p>
              <p className="text-[13px] text-sub">
                {ready
                  ? '개념별 근거 페이지까지 연결했어요'
                  : file.status === 'failed'
                    ? '파일을 바꿔 다시 올려 주세요'
                    : '잠시만 기다려 주세요'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </Screen>
  )
}
