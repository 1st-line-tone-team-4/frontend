import { useEffect, useRef } from 'react'

// 녹음 중 파형 · 오른쪽에서 새 음량이 들어오고 왼쪽으로 흘러가요
export default function MicWave({ levelRef, bars = 28, className = '' }) {
  const wrap = useRef(null)

  useEffect(() => {
    const history = Array(bars).fill(0)
    let raf = 0
    let last = 0
    const tick = (now) => {
      if (now - last > 70) {
        last = now
        history.shift()
        history.push(levelRef?.current ?? 0)
        const els = wrap.current?.children ?? []
        for (let i = 0; i < els.length; i++) {
          els[i].style.height = `${Math.max(12, Math.min(100, history[i] * 140))}%`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bars, levelRef])

  return (
    <div ref={wrap} className={`flex h-6 items-center gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-primary transition-[height] duration-75"
          style={{ height: '12%' }}
        />
      ))}
    </div>
  )
}

// 학생이 생각 중일 때 점 세 개
export function TypingDots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label="생각하는 중">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-[6px] rounded-full bg-current"
          style={{ animation: `dot-bounce 1.2s ${i * 0.16}s infinite ease-in-out` }}
        />
      ))}
    </span>
  )
}
