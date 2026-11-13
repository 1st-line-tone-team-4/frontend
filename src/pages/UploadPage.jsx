import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import iconUpload from '@/assets/icons/upload.svg'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import { Field, Input } from '@/components/Field'
import Screen, { PageTitle } from '@/components/Screen'
import UploadFileList, { RejectedFiles } from '@/components/UploadFileList'
import { useUploadQueueStore } from '@/stores/useUploadQueueStore'
import { fileBaseName } from '@/utils/format'
import { ACCEPT, MAX_FILES } from '@/utils/materialFiles'

// 02 자료 업로드
export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const items = useUploadQueueStore((s) => s.items)
  const { addFiles, startAll, remove, retry } = useUploadQueueStore.getState()
  const maxFiles = MAX_FILES // 명세: 계획 생성 material_ids 최대 20개
  const [rejected, setRejected] = useState([])
  const isCalculating = items.some((it) => it.pagesStatus === 'counting')
  // null 이면 직접 입력 전 → 처음 올린 파일명을 시험 이름으로 사용
  const [typedName, setTypedName] = useState(null)
  const examName = typedName ?? fileBaseName(items[0]?.name)
  const [dragging, setDragging] = useState(false)
  const pendingCount = items.filter((item) => item.status === 'idle').length

  const selectFiles = (fileList) => {
    if (!fileList?.length) return
    setRejected(addFiles([...fileList]))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    selectFiles(e.dataTransfer.files)
  }

  const onSubmit = () => {
    if (items.length === 0) return fileRef.current?.click()
    if (isCalculating) return
    startAll()
    navigate('/upload/exam', { state: { examName } })
  }

  return (
    <Screen
      header={{ title: '자료 업로드' }}
      bottom={
        <Button onClick={onSubmit} disabled={isCalculating}>
          {pendingCount > 1 ? `파일 ${pendingCount}개 업로드하기` : '파일 업로드하기'}
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
          {items.length
            ? `파일 추가 (${items.length}/${maxFiles})`
            : '파일을 선택하거나 여기에 놓으세요'}
        </span>
        <Chip tone="white">PDF · 텍스트 · 이미지</Chip>
      </button>
      <input
        ref={fileRef}
        type="file"
        id="study-material"
        name="study-material"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          selectFiles(e.target.files)
          e.target.value = '' // 같은 파일을 지웠다 다시 고를 수 있게
        }}
      />

      {(items.length > 0 || rejected.length > 0) && (
        <div className="mt-4 flex flex-col gap-[10px]">
          <RejectedFiles rejected={rejected} />
          <UploadFileList items={items} onRemove={remove} onRetry={retry} />
        </div>
      )}

      <Field label="시험 이름" className="mt-6">
        <Input value={examName} onChange={(e) => setTypedName(e.target.value)} />
      </Field>
    </Screen>
  )
}
