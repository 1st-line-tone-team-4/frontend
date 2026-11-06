// 작은 라벨 칩 (D-day, 상태, 파일 형식 등)
const tones = {
  primary: 'bg-primary-soft text-primary',
  solid: 'bg-primary text-white',
  white: 'bg-white text-sub',
  outline: 'border border-line bg-white text-sub',
  cool: 'bg-cool text-sub',
  secondary: 'bg-secondary-soft text-secondary',
  error: 'bg-error-soft text-error',
}

export default function Chip({ tone = 'primary', className = '', children }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-[3px] rounded-md px-2 py-[3px] text-[11px] leading-[1.3] font-bold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
