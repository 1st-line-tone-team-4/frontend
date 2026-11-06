import iconCheck from '@/assets/icons/check-white-12.svg'

// 체크 박스 (20px, 파란 채움)
export default function Checkbox({ checked, onChange, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={`flex size-5 shrink-0 items-center justify-center rounded-md ${
        checked ? 'bg-primary' : 'border-[1.5px] border-line bg-white'
      } ${className}`}
    >
      {checked && <img src={iconCheck} alt="" className="size-3" />}
    </button>
  )
}
