import { getPdfPageCount } from '@/utils/pdf'

// 명세상 업로드 가능한 형식 · 크기 · 개수 (study-plans material_ids 최대 20개)
export const ALLOWED_MIME = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg']
export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MiB
export const MAX_FILES = 20
export const ACCEPT = '.pdf,.txt,.png,.jpg,.jpeg'

const EXT_MIME = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

// 같은 파일 판단 기준: 이름 + 크기 + 수정 시각
export const fileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`

// 브라우저가 type 을 비워 줄 때(일부 OS 의 .txt 등)는 확장자로 추정
export function resolveMime(file) {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  return EXT_MIME[ext] ?? ''
}

/**
 * 추가하려는 파일 검증 · 위반한 파일만 빼고 이유를 돌려줘요
 * @param {File[]} files 새로 고른 파일
 * @param {{ key: string }[]} existing 이미 목록에 있는 파일
 */
export function validateFiles(files, existing = []) {
  const keys = new Set(existing.map((item) => item.key))
  let slots = MAX_FILES - existing.length
  const accepted = []
  const rejected = []

  for (const file of files) {
    const key = fileKey(file)
    const mime = resolveMime(file)
    let reason = null
    if (!ALLOWED_MIME.includes(mime)) reason = 'PDF · 텍스트 · PNG · JPEG 파일만 올릴 수 있어요'
    else if (file.size === 0) reason = '빈 파일이에요'
    else if (file.size > MAX_FILE_BYTES) reason = '파일 하나당 20MB까지 올릴 수 있어요'
    else if (keys.has(key)) reason = '이미 추가한 파일이에요'
    else if (slots <= 0) reason = `자료는 최대 ${MAX_FILES}개까지 올릴 수 있어요`

    if (reason) {
      rejected.push({ name: file.name, reason })
      continue
    }
    keys.add(key)
    slots -= 1
    accepted.push({ file, key, mime })
  }
  return { accepted, rejected }
}

// 브라우저에서 셀 수 있는 페이지 수 · PDF 는 실제 페이지, 이미지는 1장, 텍스트는 알 수 없음(null)
export async function countPages(file, mime) {
  if (mime === 'application/pdf') return getPdfPageCount(file)
  if (mime.startsWith('image/')) return 1
  return null
}
