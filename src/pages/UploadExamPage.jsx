import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import iconUpload from '@/assets/icons/upload-sm.svg'
import iconFile from '@/assets/icons/file.svg'
import iconCheck from '@/assets/icons/check-primary.svg'
import iconCheckCircle from '@/assets/icons/check-circle.svg'
import { USE_MOCK } from '@/api/client'
import Button from '@/components/Button'
import Card, { Divider, SectionTitle } from '@/components/Card'
import Chip from '@/components/Chip'
import { Field, Input, Select } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import UploadFileList, { RejectedFiles } from '@/components/UploadFileList'
import { useCreateExamGoal, useMaterial } from '@/hooks/useStudyApi'
import { useStudyStore } from '@/stores/useStudyStore'
import { ACTIVE_STATUSES, useUploadQueueStore } from '@/stores/useUploadQueueStore'
import { daysUntil, fileBaseName, formatBytes, MIME_LABEL } from '@/utils/format'
import { ACCEPT } from '@/utils/materialFiles'

// 더미 (목 모드에서 업로드한 파일이 없을 때 표시)
const DUMMY_FILE = { name: '토익 문법 정리.pdf', meta: 'PDF · 32페이지 · 2.4 MB', status: 'ready' }
const DUMMY_PAGES = 32

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

const STATUS_CHIP = {
  upload_pending: '업로드 중',
  queued: '분석 대기',
  processing: '분석 중',
  ready: '업로드 완료',
  failed: '분석 실패',
}

const ANALYSIS_STEPS = ['파일 확인', '문서 구조 분석', '개념과 근거 정리']

function MaterialAnalyzingView({ status }) {
  const [step, setStep] = useState(status === 'processing' ? 1 : 0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1))
    }, 900)
    return () => clearInterval(timer)
  }, [])

  return (
    <Screen header={{ title: '자료 분석 중' }} className="gap-8">
      <PageTitle
        title="자료를 분석하고 있어요"
        desc="AI가 문서의 구조와 개념을 정리하고 있어요. 분석이 끝나면 자동으로 다음 단계로 넘어갈 수 있어요."
      />

      <div className="flex flex-col items-center gap-3 py-4">
        <span
          className="flex size-20 animate-spin items-center justify-center rounded-full border-4 border-primary/20 border-t-primary text-3xl font-bold text-primary"
          aria-label="자료 분석 중"
        >
          @
        </span>
        <p className="text-sm font-bold text-primary">자료를 분석하고 있어요…</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-sub">진행 중</span>
          <span className="text-primary">AI 분석</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cool">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>

      <ol className="flex flex-col gap-1">
        {ANALYSIS_STEPS.map((label, index) => {
          const done = index < step
          const current = index === step
          return (
            <li key={label} className="flex items-center gap-[14px] py-3">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? 'bg-primary text-white'
                    : current
                      ? 'border-2 border-primary text-primary'
                      : 'border-[1.5px] border-line text-muted'
                }`}
              >
                {done ? <img src={iconCheck} alt="" className="size-[11px]" /> : index + 1}
              </span>
              <span className={`text-[15px] ${current ? 'font-bold' : 'text-muted'}`}>{label}</span>
              {current && <span className="ml-auto text-xs text-primary">진행 중</span>}
            </li>
          )
        })}
      </ol>
    </Screen>
  )
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

// 전체 페이지 범위 → 파일별 범위 ('문법 p.30–32 · 어휘 p.1–5')
function formatRange(start, end, segments) {
  const span = (s, e) => (s === e ? `p.${s}` : `p.${s}–${e}`)
  if (segments.length <= 1) return span(start, end)
  const parts = []
  let offset = 0
  for (const seg of segments) {
    const s = Math.max(start, offset + 1)
    const e = Math.min(end, offset + seg.pages)
    if (s <= e) parts.push(`${seg.label} ${span(s - offset, e - offset)}`)
    offset += seg.pages
  }
  return parts.join(' · ')
}

// 업로드 자료들의 페이지 수 합계와 시험 날짜로 하루 권장 학습량 계산
// segments: [{ label: 파일 이름, pages }] (업로드 순서대로 이어서 읽어요)
function buildReadingPlan(segments, examDate) {
  const pageCount = segments.reduce((sum, seg) => sum + seg.pages, 0)
  if (!pageCount || !examDate) return null

  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dDay = daysUntil(examDate)

  if (dDay <= 0) return null

  const studyDays = Math.max(1, dDay - 1)
  // 분량이 학습일보다 적으면 하루 1페이지씩 · 나머지는 앞쪽 날짜에 1페이지씩 더 배분
  const readingDays = Math.min(studyDays, pageCount)
  const basePages = Math.floor(pageCount / readingDays)
  const extraDays = pageCount % readingDays
  const pagesPerDay = Math.ceil(pageCount / readingDays)

  const plan = []
  let currentPage = 1

  for (let i = 0; i < readingDays; i += 1) {
    const endPage = currentPage + basePages + (i < extraDays ? 1 : 0) - 1
    const planDate = new Date(today)
    planDate.setDate(today.getDate() + i)

    plan.push({
      day: i === 0 ? `${md(planDate)} · 오늘 목표` : md(planDate),
      range: formatRange(currentPage, endPage, segments),
      today: i === 0,
    })
    currentPage = endPage + 1
  }

  if (dDay > 1) {
    const [year, month, day] = examDate.split('-').map(Number)
    const reviewDate = new Date(year, month - 1, day - 1)
    plan.push({ day: `${md(reviewDate)} · 마지막 복습`, range: '전체 복습' })
  }

  return {
    plan,
    summary: [
      [
        '총 페이지',
        segments.length > 1
          ? `${pageCount}페이지 (${segments.length}개 파일)`
          : `${pageCount}페이지`,
      ],
      ['남은 기간', `${dDay}일`],
      ['최소 일일 목표', `${pagesPerDay}페이지`],
    ],
    chip: dDay > 1 ? `${readingDays}일 학습 + 1일 복습` : '벼락치기 학습',
    note:
      dDay > 1
        ? `권장안은 ${readingDays}일 동안 하루 ${pagesPerDay}페이지 이내로 읽고 마지막 날은 전체 복습하는 방식이에요.`
        : '시험이 얼마 남지 않았어요! 전체 분량을 오늘 모두 확인하는 것을 권장해요.',
  }
}

// 03 자료 업로드 · 시험 선택
export default function UploadExamPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileRef = useRef(null)
  const savedExamDate = useStudyStore((s) => s.examDate)

  // null 이면 직접 입력 전 → 앞 화면의 시험 이름, 없으면 올린 파일명을 사용
  const [typedTitle, setTypedTitle] = useState(state?.examName || null)
  const [examDate, setExamDate] = useState(savedExamDate ?? getLocalDateString())
  const [rejected, setRejected] = useState([])
  const dday = formatDday(daysUntil(examDate))

  // 여러 파일 업로드 큐
  const items = useUploadQueueStore((s) => s.items)
  const { addFiles, remove, retry } = useUploadQueueStore.getState()
  const hasQueue = items.length > 0
  const activeCount = items.filter((it) => ACTIVE_STATUSES.includes(it.status)).length
  const doneCount = items.filter((it) => it.status === 'succeeded').length
  const failedCount = items.filter((it) => it.status === 'failed').length
  const liveItems = items.filter((it) => it.status !== 'failed')

  // 큐가 비어 있을 때(새로고침 등)는 기존처럼 저장된 자료 1개를 보여줘요
  const materialId = useStudyStore((s) => s.materialId)
  const material = useMaterial(hasQueue ? null : materialId).data
  const createGoal = useCreateExamGoal()

  // 앞 화면에서 선택만 하고 넘어온 파일이 있으면 업로드 시작
  useEffect(() => {
    useUploadQueueStore.getState().startAll()
  }, [])

  // 목 모드는 더미, 실제 모드는 API 자료 정보
  const file = hasQueue
    ? null
    : USE_MOCK
      ? DUMMY_FILE
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
  const title = typedTitle ?? fileBaseName(hasQueue ? items[0].name : file?.name)

  // 파일별 페이지 수 (실패한 파일 제외 · 페이지 수를 모르는 파일은 계산에서 빠져요)
  const segments = hasQueue
    ? liveItems
        .filter((it) => it.pages)
        .map((it) => ({ label: fileBaseName(it.name), pages: it.pages }))
    : USE_MOCK
      ? [{ label: fileBaseName(DUMMY_FILE.name), pages: DUMMY_PAGES }]
      : material?.page_count
        ? [{ label: fileBaseName(material.filename), pages: material.page_count }]
        : []
  const unknownPageCount = liveItems.filter(
    (it) => !it.pages && it.pagesStatus !== 'counting',
  ).length
  const pageCount = segments.reduce((sum, seg) => sum + seg.pages, 0)
  const reading = pageCount ? buildReadingPlan(segments, examDate) : null
  const hasInvalidExamDate = pageCount && !reading

  // 분석 상태 (큐: 실패를 뺀 나머지가 모두 끝났는지 · 기존: 자료 1개 상태)
  const ready = hasQueue ? doneCount > 0 && activeCount === 0 : file?.status === 'ready'
  const allFailed = hasQueue ? activeCount === 0 && doneCount === 0 : file?.status === 'failed'
  // 전체 화면 로딩은 업로드 목록이 없을 때(새로고침 등) 저장된 자료가 실제로 분석 중일 때만
  // 업로드 목록이 있으면 파일별 상태 칩(업로드 중 · 분석 중 · 업로드 완료)으로 보여줘요
  const isAnalyzing =
    !hasQueue &&
    !USE_MOCK &&
    (!material || ['upload_pending', 'queued', 'processing'].includes(material.processing_status))

  const onPickFile = (e) => {
    if (e.target.files?.length) setRejected(addFiles(e.target.files, { start: true }))
    e.target.value = '' // 같은 파일을 지웠다 다시 고를 수 있게
  }

  const onSubmit = () => {
    if (!USE_MOCK && !title.trim()) return alert('시험 이름을 입력해 주세요.')
    if (hasQueue) {
      if (activeCount > 0) return alert('자료 분석이 끝나면 다음으로 넘어갈 수 있어요.')
      if (doneCount === 0) return alert('분석이 끝난 자료가 없어요. 파일을 다시 올려 주세요.')
    } else if (!USE_MOCK && !ready) {
      return alert('자료 분석이 끝나면 다음으로 넘어갈 수 있어요.')
    }
    createGoal.mutate(
      { title: title.trim(), exam_type: guessExamType(title), exam_date: examDate },
      { onSuccess: () => navigate('/concepts'), onError: (err) => alert(err.message) },
    )
  }

  if (isAnalyzing) {
    return <MaterialAnalyzingView status={material?.processing_status ?? 'queued'} />
  }

  return (
    <Screen
      header={{ title: '강의자료 업로드' }}
      bottom={
        <>
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
            {activeCount > 0
              ? `업로드 중이에요… (${doneCount}/${liveItems.length})`
              : '파일을 추가해보세요'}
          </span>
          <Chip tone="white">PDF · 텍스트 · 이미지</Chip>
        </button>
        <input
          ref={fileRef}
          id="study-material-replace"
          name="study-material-replace"
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={onPickFile}
        />
        <RejectedFiles rejected={rejected} />
        <UploadFileList items={items} onRemove={remove} onRetry={retry} />
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
          <Input
            id="exam-name"
            name="exam-name"
            value={title}
            onChange={(e) => setTypedTitle(e.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-[14px]">
          <Field label="과목">
            <Select options={['영어', '국어', '수학', '기타']} />
          </Field>
        </div>
        <Field label="시험 날짜">
          <Input
            id="exam-date"
            name="exam-date"
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
            prefix={<Chip>{dday}</Chip>}
          />
        </Field>
      </div>

      {(pageCount > 0 || (!reading && USE_MOCK && !hasQueue)) && (
        <>
          <Divider />

          <div className="flex flex-col gap-[14px]">
            <SectionTitle
              title="하루 권장 학습량"
              desc="업로드 파일과 시험 날짜를 기준으로 계산했어요. 문제 풀이, 복습은 별도로 시간을 더 고려해 주세요."
            />
            {reading ? (
              <>
                <dl className="flex flex-col gap-[10px] rounded-[14px] bg-cool px-4 py-[14px] text-[13px] leading-[1.4]">
                  {reading.summary.map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-sub">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between pt-[2px]">
                  <p className="text-sm leading-[1.4] font-bold tracking-[-0.14px]">권장 학습안</p>
                  <Chip>{reading.chip}</Chip>
                </div>
                <ul className="divide-y divide-line">
                  {reading.plan.map((p) => (
                    <li
                      key={p.day}
                      className={`flex justify-between gap-3 py-[10px] text-[13px] leading-[1.4] ${p.today ? 'font-bold text-primary' : ''}`}
                    >
                      <span className="shrink-0">{p.day}</span>
                      <span className="min-w-0 text-right font-bold break-all">{p.range}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-[1.5] text-sub">{reading.note}</p>
              </>
            ) : hasInvalidExamDate ? (
              <p className="rounded-[14px] bg-cool px-4 py-[14px] text-xs leading-[1.5] text-sub">
                시험 날짜가 오늘이거나 지났어요. 미래 날짜를 선택하면 {pageCount}페이지를 남은
                기간에 맞춰 자동으로 나눠 드려요.
              </p>
            ) : (
              <>
                <dl className="flex flex-col gap-[10px] rounded-[14px] bg-cool px-4 py-[14px] text-[13px] leading-[1.4]">
                  {DUMMY_SUMMARY.map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-sub">{k}</dt>
                      <dd className="font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="divide-y divide-line">
                  {DUMMY_PLAN.map((p) => (
                    <li
                      key={p.day}
                      className="flex justify-between py-[10px] text-[13px] leading-[1.4]"
                    >
                      <span>{p.day}</span>
                      <span className="font-bold">{p.range}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {hasQueue && unknownPageCount > 0 && (
              <p className="text-xs leading-[1.5] text-sub">
                페이지 수를 알 수 없는 파일 {unknownPageCount}개는 계산에서 빠졌어요. 텍스트 파일은
                분석이 끝나면 반영돼요.
              </p>
            )}
          </div>
        </>
      )}

      {(file || hasQueue) && (
        <Card tone="gradient" className="rounded-[18px] p-[18px]">
          <div className="flex items-center gap-[10px]">
            <img src={iconCheckCircle} alt="" className="size-[22px]" />
            <div className="flex flex-col leading-[1.4]">
              <p className="text-base font-bold tracking-[-0.16px]">
                {ready
                  ? '자료 분석이 완료됐어요'
                  : allFailed
                    ? '자료 분석에 실패했어요'
                    : '자료를 분석하고 있어요'}
              </p>
              <p className="text-[13px] text-sub">
                {ready
                  ? failedCount > 0
                    ? `${doneCount}개 완료 · 실패한 ${failedCount}개는 학습 계획에서 빠져요`
                    : '개념별 근거 페이지까지 연결했어요'
                  : allFailed
                    ? '파일을 바꿔 다시 올려 주세요'
                    : hasQueue
                      ? `${doneCount}/${liveItems.length}개 완료 · 잠시만 기다려 주세요`
                      : '잠시만 기다려 주세요'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </Screen>
  )
}
