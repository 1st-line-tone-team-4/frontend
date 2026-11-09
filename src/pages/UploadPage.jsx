import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import iconUpload from '@/assets/icons/upload.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { Field, Input } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import { useUploadMaterial } from '@/hooks/useStudyApi'
import { fileBaseName } from '@/utils/format'

// 명세상 업로드 가능한 형식: PDF · 텍스트 · PNG · JPEG
const ACCEPT = '.pdf,.txt,.png,.jpg,.jpeg'

// 02 자료 업로드
export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  // null 이면 직접 입력 전 → 올린 파일명을 시험 이름으로 사용
  const [typedName, setTypedName] = useState(null)
  const examName = typedName ?? fileBaseName(file?.name)
  const [dragging, setDragging] = useState(false)
  const upload = useUploadMaterial()

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
  }

  const onSubmit = () => {
    if (!file) return fileRef.current?.click()
    upload.mutate(file, {
      onSuccess: () => navigate('/upload/exam', { state: { examName } }),
      onError: (err) => alert(err.message),
    })
  }

  return (
    <Screen
      header={{ title: '자료 업로드' }}
      bottom={
        <Button onClick={onSubmit} disabled={upload.isPending}>
          {upload.isPending ? '업로드 중이에요…' : '파일 업로드하기'}
        </Button>
      }
      className="gap-0"
    >
      <PageTitle title="자료를 올려주세요" desc="PDF, 텍스트, 이미지 파일을 업로드해 주세요." />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-6 flex flex-col items-center gap-[10px] rounded-[18px] border-[1.5px] border-dashed border-primary px-4 py-7 ${
          dragging ? 'bg-primary/10' : 'bg-primary-soft'
        }`}
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-white">
          <img src={iconUpload} alt="" className="size-[23.04px]" />
        </span>
        <span className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">
          {file ? file.name : '파일을 선택하거나 여기에 놓으세요'}
        </span>
        <Chip tone="white">PDF · 텍스트 · 이미지</Chip>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => setFile(e.target.files[0] ?? null)}
      />

      <Field label="시험 이름" className="mt-6">
        <Input value={examName} onChange={(e) => setTypedName(e.target.value)} />
      </Field>

      <div className="mt-[54px] flex flex-col gap-[10px]">
        <p className="text-[15px] leading-[1.4] font-bold tracking-[-0.15px]">
          올릴 파일이 없나요?
        </p>
        <p className="text-[13px] leading-[1.5] text-sub">
          파일 없이도 원하는 강의를 검색하고 선택해 시작할 수 있어요.
        </p>
        <Button to="/lectures" variant="secondary">
          강의 검색하기
        </Button>
      </div>
    </Screen>
  )
}
