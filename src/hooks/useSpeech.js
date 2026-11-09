import { useCallback, useEffect, useRef } from 'react'

/**
 * 음성 설명(A-05)에 쓰는 브라우저 음성 기능 모음
 * - 받아쓰기: Web Speech API (SpeechRecognition, 한국어)
 * - 마이크 음량: Web Audio AnalyserNode → 0~1 (오브·파형 애니메이션)
 * - 다시 듣기: MediaRecorder 로 발화마다 녹음
 * - 학생 질문 읽기: speechSynthesis (ko-KR)
 */
const SR =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const speechSupport = {
  recognition: !!SR,
  synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
  media: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  recorder: typeof window !== 'undefined' && 'MediaRecorder' in window,
}

// 'granted' | 'denied' | 'prompt' | 'unknown'
export async function getMicPermission() {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state
  } catch {
    return 'unknown'
  }
}

export async function requestMicStream() {
  if (!speechSupport.media)
    throw { code: 'UNSUPPORTED', message: '이 브라우저는 마이크를 지원하지 않아요.' }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (err) {
    const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
    throw {
      code: denied ? 'DENIED' : 'NO_DEVICE',
      message: denied
        ? '글로 설명할 수 있어요. 설정에서 마이크를 켜면 말로도 설명할 수 있어요.'
        : '마이크를 찾지 못했어요. 글로 설명해 주세요.',
    }
  }
}

export const stopStream = (stream) => stream?.getTracks().forEach((t) => t.stop())

/* ── 마이크 음량 ─────────────────────────────── */
export function useMicLevel() {
  const levelRef = useRef(0)
  const ctxRef = useRef(null)
  const rafRef = useRef(0)

  const detach = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    levelRef.current = 0
  }, [])

  const attach = useCallback(
    (stream) => {
      detach()
      if (!stream) return
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      ctxRef.current = ctx
      const buf = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4.5)
        // 올라갈 땐 빠르게, 내려갈 땐 천천히
        const prev = levelRef.current
        levelRef.current = rms > prev ? prev + (rms - prev) * 0.5 : prev + (rms - prev) * 0.12
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    },
    [detach],
  )

  useEffect(() => detach, [detach])
  return { levelRef, attach, detach }
}

/* ── 받아쓰기 ────────────────────────────────── */
/**
 * handlers: { onInterim(text), onSilence(text), onError(code) }
 * - silenceMs 동안 새 결과가 없으면 onSilence 로 한 단락을 넘겨요 (기획: 음성 멈춤 2초 이상)
 * - 크롬은 말이 멈추면 인식을 스스로 끝내므로, 켜져 있는 동안 자동으로 다시 시작해요
 */
export function useDictation({ lang = 'ko-KR', silenceMs = 2000, ...handlers } = {}) {
  const h = useRef(handlers)
  h.current = handlers
  const recRef = useRef(null)
  const activeRef = useRef(false)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const timerRef = useRef(0)

  const text = () => `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim()
  const reset = () => {
    finalRef.current = ''
    interimRef.current = ''
  }

  const stop = useCallback(() => {
    activeRef.current = false
    clearTimeout(timerRef.current)
    try {
      recRef.current?.stop()
    } catch {
      /* 이미 멈춤 */
    }
    const t = text()
    reset()
    return t
  }, [])

  const abort = useCallback(() => {
    activeRef.current = false
    clearTimeout(timerRef.current)
    try {
      recRef.current?.abort()
    } catch {
      /* 이미 멈춤 */
    }
    reset()
  }, [])

  const start = useCallback(
    (initial = '') => {
      if (!SR) {
        h.current.onError?.('unsupported')
        return false
      }
      if (activeRef.current) return true
      finalRef.current = initial
      interimRef.current = ''
      const rec = new SR()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current = `${finalRef.current} ${r[0].transcript}`
          else interim += r[0].transcript
        }
        interimRef.current = interim
        h.current.onInterim?.(text())
        clearTimeout(timerRef.current)
        if (h.current.onSilence) {
          timerRef.current = setTimeout(() => {
            const t = text()
            if (!t) return
            reset()
            h.current.onSilence(t)
          }, silenceMs)
        }
      }
      rec.onerror = (e) => {
        if (e.error === 'aborted') return
        if (e.error === 'no-speech') return h.current.onError?.('no-speech')
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
          activeRef.current = false
        h.current.onError?.(e.error)
      }
      rec.onend = () => {
        // 확정 안 된 중간 결과는 유지하고 다시 시작
        if (interimRef.current) {
          finalRef.current = `${finalRef.current} ${interimRef.current}`
          interimRef.current = ''
        }
        if (activeRef.current) {
          try {
            rec.start()
          } catch {
            activeRef.current = false
          }
        }
      }
      recRef.current = rec
      activeRef.current = true
      try {
        rec.start()
      } catch {
        activeRef.current = false
        return false
      }
      return true
    },
    [lang, silenceMs],
  )

  useEffect(() => () => abort(), [abort])
  return { start, stop, abort, isActive: () => activeRef.current }
}

/* ── 발화 녹음 (다시 듣기) ────────────────────── */
export function useRecorder() {
  const recRef = useRef(null)
  const chunks = useRef([])

  const start = useCallback((stream) => {
    if (!speechSupport.recorder || !stream) return
    try {
      const rec = new MediaRecorder(stream)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.start()
      recRef.current = rec
    } catch {
      recRef.current = null
    }
  }, [])

  // 녹음을 끝내고 재생 URL 을 돌려줘요 (없으면 null)
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const rec = recRef.current
        recRef.current = null
        if (!rec || rec.state === 'inactive') return resolve(null)
        rec.onstop = () => {
          const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
          resolve(blob.size > 0 ? URL.createObjectURL(blob) : null)
        }
        rec.stop()
      }),
    [],
  )

  return { start, stop }
}

/* ── 학생 질문 읽기 (TTS) ─────────────────────── */
let koVoice = null
function pickVoice() {
  if (!speechSupport.synthesis) return null
  const voices = window.speechSynthesis.getVoices()
  koVoice =
    voices.find((v) => v.lang === 'ko-KR' && /female|여|Yuna|SunHi|Google/i.test(v.name)) ??
    voices.find((v) => v.lang?.startsWith('ko')) ??
    null
  return koVoice
}
if (speechSupport.synthesis) {
  pickVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

export function speak(text, { rate = 1, onStart, onEnd } = {}) {
  if (!speechSupport.synthesis || !text) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.voice = koVoice ?? pickVoice()
  u.rate = rate
  u.pitch = 1.08
  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    onEnd?.()
  }
  u.onstart = () => onStart?.()
  u.onend = end
  u.onerror = end
  window.speechSynthesis.speak(u)
  // 일부 브라우저는 onend 가 오지 않아요 → 글자 수로 대략 계산한 시간 뒤 강제로 끝내요
  setTimeout(end, Math.max(2500, (text.length * 170) / rate + 1500))
}

export function stopSpeaking() {
  if (speechSupport.synthesis) window.speechSynthesis.cancel()
}
