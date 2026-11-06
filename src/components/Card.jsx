// 카드 박스 공통
const tones = {
  line: 'border border-line bg-white',
  cool: 'bg-cool',
  primary: 'bg-primary-soft',
  // TeachMe/그라데이션/학습
  gradient: 'bg-[linear-gradient(159deg,var(--color-primary-soft)_0%,var(--color-secondary-soft)_74%)]',
}

export default function Card({ tone = 'line', as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`flex flex-col gap-[10px] rounded-2xl p-4 ${tones[tone]} ${className}`} {...props}>
      {children}
    </Tag>
  )
}

// 섹션 제목 + 설명
export function SectionTitle({ title, desc, right }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-base leading-[1.4] font-bold tracking-[-0.16px]">{title}</h2>
        {desc && <p className="text-[13px] leading-[1.5] text-sub">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

// inset: 왼쪽 들여쓰기(px) — 목록에서 아이콘 뒤부터 선을 그을 때
export function Divider({ inset = 0 }) {
  return <hr className="border-line" style={inset ? { marginLeft: inset } : undefined} />
}
