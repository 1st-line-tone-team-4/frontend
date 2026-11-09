import iconRight from '@/assets/icons/right-muted-16.svg'
import Toggle from './Toggle'

// 설정 화면 공통 · 섹션 제목 + 행 목록
export function SettingsSection({ title, desc, children }) {
  return (
    <section className="flex flex-col gap-1">
      {title && <h2 className="pt-1 text-[13px] leading-[1.3] font-bold text-sub">{title}</h2>}
      {desc && <p className="text-xs leading-[1.5] text-muted">{desc}</p>}
      <ul className="flex flex-col divide-y divide-line">{children}</ul>
    </section>
  )
}

/**
 * 한 줄 설정
 * - toggle: { checked, onChange } 스위치 · value: 오른쪽 값 · onClick: 누르면 이동(화살표 표시) · right: 직접 넣는 요소
 */
export function SettingsRow({ title, desc, toggle, value, onClick, right, danger }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-px leading-[1.4]">
        <span className={`text-[15px] font-medium ${danger ? 'text-error' : ''}`}>{title}</span>
        {desc && <span className="text-xs text-muted">{desc}</span>}
      </span>
      {value && <span className="text-sm font-medium text-sub">{value}</span>}
      {right}
      {toggle && (
        <Toggle checked={toggle.checked} onChange={toggle.onChange} disabled={toggle.disabled} />
      )}
      {onClick && !toggle && <img src={iconRight} alt="" className="size-4" />}
    </>
  )
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex w-full items-center gap-3 py-[14px] text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-3 py-[14px]">{body}</div>
      )}
    </li>
  )
}
