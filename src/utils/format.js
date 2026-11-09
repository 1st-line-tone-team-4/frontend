// 화면 표시용 포맷 함수

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatDday(days) {
  if (days === null || days === undefined) return null
  if (days === 0) return 'D-Day'
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
}

// 'YYYY-MM-DD' (Asia/Seoul 날짜) → Date (로컬 자정)
export function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toYmd(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// '2026-11-04' → { date: '11.04', day: '수' }
export function formatMonthDay(ymd) {
  const dt = parseYmd(ymd)
  return {
    date: `${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`,
    day: WEEKDAYS[dt.getDay()],
  }
}

// '2026-11-08' → '11월 8일 일요일'
export function formatKoreanDate(ymd) {
  const dt = parseYmd(ymd)
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WEEKDAYS[dt.getDay()]}요일`
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 0~1 → 58
export const toPercent = (ratio) =>
  ratio === null || ratio === undefined ? null : Math.round(ratio * 100)

export const MIME_LABEL = {
  'application/pdf': 'PDF',
  'text/plain': '텍스트',
  'image/png': '이미지',
  'image/jpeg': '이미지',
}

// 근거 목록 → 'p.24' 또는 'p.24–25'
export function pageRange(evidence = []) {
  const pages = [...new Set(evidence.map((e) => e.page_number))].sort((a, b) => a - b)
  if (pages.length === 0) return ''
  if (pages.length === 1) return `p.${pages[0]}`
  return `p.${pages[0]}–${pages[pages.length - 1]}`
}

// '토익 문법 정리.pdf' → '토익 문법 정리' (시험 이름 기본값)
export const fileBaseName = (name = '') => name.replace(/\.[^./\\]+$/, '').trim()
