import { Link } from 'react-router-dom'

// TM/Button · Primary=주요 행동(1개), Secondary=보조 행동, Disabled=출시 예정/비활성
const variants = {
  primary: 'bg-primary text-white',
  secondary: 'bg-primary-soft text-primary',
  disabled: 'bg-cool text-muted cursor-not-allowed',
}

export default function Button({ to, variant = 'primary', className = '', children, ...props }) {
  const cls = `flex h-[52px] w-full items-center justify-center rounded-[14px] text-[17px] leading-[1.3] font-bold tracking-[-0.17px] ${variants[variant]} ${className}`
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
