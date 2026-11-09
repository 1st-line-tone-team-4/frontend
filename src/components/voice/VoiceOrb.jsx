import { useEffect, useRef } from 'react'

/**
 * 음성 대화 오브 · 상태에 따라 움직임이 달라요
 * - listening: 내 목소리 크기만큼 커지고, 크게 말하면 바깥 물결이 퍼져요
 * - thinking : 안쪽 빛이 빠르게 돌아요
 * - speaking : 학생이 말하는 리듬으로 출렁여요
 * - muted    : 작아지고 흐려져요
 * - connecting: 천천히 숨 쉬듯 움직여요
 */
export default function VoiceOrb({ state, levelRef, size = 220, onClick, label }) {
  const coreRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now) => {
      const t = (now - start) / 1000
      const level = levelRef?.current ?? 0
      let scale = 1
      if (state === 'listening') scale = 1 + level * 0.32
      else if (state === 'speaking')
        scale =
          1.04 + 0.06 * Math.sin(t * 8.5) * Math.abs(Math.sin(t * 2.1)) + 0.02 * Math.sin(t * 3)
      else if (state === 'thinking') scale = 0.96 + 0.025 * Math.sin(t * 4)
      else if (state === 'muted') scale = 0.88
      else scale = 0.97 + 0.03 * Math.sin(t * 1.8)
      if (coreRef.current) coreRef.current.style.transform = `scale(${scale.toFixed(4)})`
      if (ringRef.current) {
        const show =
          state === 'listening' ? Math.min(1, level * 2.2) : state === 'speaking' ? 0.55 : 0
        ringRef.current.style.opacity = show.toFixed(3)
        ringRef.current.style.transform = `scale(${(1.05 + (state === 'listening' ? level : 0.15) * 0.5).toFixed(4)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state, levelRef])

  const spin = state === 'thinking' ? '2.2s' : state === 'speaking' ? '5s' : '9s'
  const muted = state === 'muted'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      style={{ width: size, height: size }}
    >
      {/* 바깥 물결 */}
      <span
        ref={ringRef}
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(99,150,248,0.28)_40%,rgba(124,132,232,0)_70%)] transition-opacity"
        style={{ opacity: 0 }}
      />
      {(state === 'speaking' || state === 'thinking') && (
        <span
          className="absolute inset-[8%] rounded-full border-2 border-logo-blue/40"
          style={{ animation: 'orb-ring 1.8s ease-out infinite' }}
        />
      )}
      {/* 본체 */}
      <span
        ref={coreRef}
        className={`relative block size-full overflow-hidden rounded-full shadow-[0_24px_60px_-12px_rgba(63,114,224,0.55)] transition-[filter] duration-500 ${
          muted ? 'grayscale-[70%] brightness-110' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #ffffff 0%, #d9e6ff 16%, #8fb3ff 38%, #6396f8 58%, #3f72e0 80%, #5a63d6 100%)',
        }}
      >
        {/* 안쪽에서 흐르는 빛 */}
        <span
          className="absolute -inset-[20%] opacity-80 mix-blend-screen blur-2xl"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.9) 70deg, rgba(124,132,232,0.2) 160deg, rgba(255,255,255,0) 220deg, rgba(160,200,255,0.8) 300deg, rgba(255,255,255,0) 360deg)',
            animation: `orb-spin ${spin} linear infinite`,
          }}
        />
        <span
          className="absolute top-[45%] left-[10%] h-[55%] w-[70%] rounded-full bg-secondary/50 blur-2xl"
          style={{
            animation: `orb-spin ${spin} linear infinite reverse`,
            transformOrigin: '70% 20%',
          }}
        />
        <span className="absolute top-[10%] left-[18%] h-[28%] w-[38%] rounded-full bg-white/60 blur-xl" />
      </span>
    </button>
  )
}
