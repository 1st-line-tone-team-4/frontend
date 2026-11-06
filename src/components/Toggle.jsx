import toggleOff from '@/assets/icons/toggle-off.svg'

// 토글 스위치 · disabled 상태는 Figma 에셋(토글/비활성) 그대로 사용
export default function Toggle({ checked = false, onChange, disabled = false }) {
  if (disabled) return <img src={toggleOff} alt="비활성" className="h-6 w-10 shrink-0" />
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-line'}`}
    >
      <span
        className={`absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  )
}
