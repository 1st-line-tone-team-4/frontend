import iconChevdown from '@/assets/icons/chevdown.svg'

// 입력 필드 공통 (라벨 + 회색 박스)
// strong: 라벨을 13px 진한 글씨로 (문제 만들기 등 설정 화면)
export function Field({ label, strong = false, className = '', children }) {
  return (
    <label className={`flex min-w-0 flex-col gap-[6px] ${className}`}>
      <span
        className={`leading-[1.3] font-bold ${strong ? 'text-[13px] text-ink' : 'text-xs text-sub'}`}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const box =
  'w-full rounded-xl border border-[#d5dbe6] bg-cool py-3 pr-3 pl-[14px] text-[15px] leading-[1.3] font-medium text-ink outline-none placeholder:text-muted focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20'

export function Input({ icon, prefix, className = '', ...props }) {
  if (!icon && !prefix) return <input className={`${box} ${className}`} {...props} />
  return (
    <div className="relative">
      <input
        className={`${box} ${icon ? 'pr-10' : ''} ${prefix ? 'pl-[70px]' : ''} ${className}`}
        {...props}
      />
      {prefix && (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          {prefix}
        </span>
      )}
      {icon && (
        <img
          src={icon}
          alt=""
          className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2"
        />
      )}
    </div>
  )
}

export function Select({ options, className = '', ...props }) {
  return (
    <div className="relative">
      <select className={`${box} appearance-none pr-10 ${className}`} {...props}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <img
        src={iconChevdown}
        alt=""
        className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2"
      />
    </div>
  )
}

// 세그먼트 토글 (개념 선택 / 자료 전체, 하/중/상 등)
export function Segment({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl bg-cool p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`flex-1 rounded-[9px] border py-[9px] text-sm leading-[1.3] ${
            value === o
              ? 'border-line bg-white font-bold text-primary'
              : 'border-transparent font-medium text-sub'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
