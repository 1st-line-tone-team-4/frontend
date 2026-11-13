import { Link } from 'react-router-dom'

// TM/Button · Primary=주요 행동(1개), Secondary=보조 행동, Disabled=출시 예정/비활성
const variants = {
  primary: 'bg-primary text-white disabled:opacity-60',
  secondary: 'bg-primary-soft text-primary',
  soft: 'border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100',
  disabled: 'bg-cool text-muted cursor-not-allowed',
}

export default function Button({ to, variant = 'primary', className = '', children, ...props }) {
  const cls = `flex w-full items-center justify-center rounded-[14px] py-3 text-[15px] leading-[1.4] font-bold tracking-[-0.17px] ${variants[variant]} ${className}`
  if (to && variant !== 'disabled') {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} disabled={variant === 'disabled'} {...props}>
      {children}
    </button>
  )
}
