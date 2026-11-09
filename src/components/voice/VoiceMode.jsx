import { useCallback, useEffect, useRef, useState } from 'react'
import Chip from '@/components/Chip'
import { CaptionIcon, MicIcon, MicOffIcon, XIcon } from '@/components/icons'
import {
  requestMicStream,
  speak,
  speechSupport,
  stopSpeaking,
  stopStream,
  useDictation,
  useMicLevel,
  useRecorder,
} from '@/hooks/useSpeech'
import { TypingDots } from './MicWave'
import VoiceOrb from './VoiceOrb'

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/**
 * 음성 대화 모드 (A-05 · 말로 설명) — 화면 전체를 쓰는 핸즈프리 대화
 * 1) 말하면 오브가 목소리에 반응하고 자막으로 받아써요
 * 2) 2초 이상 멈추면 한 단락으로 보내고, 민지가 생각한 뒤 질문을 읽어 줘요
 * 3) 민지가 말하는 동안 오브를 누르면 끊고 바로 이어 말할 수 있어요
 *
 * props
 * - onUserTurn(text, audioUrl, { noReply }) → Promise<{ text, tag, kind } | null>  (대화에 추가 + 학생 답)
 * - onClose(): 채팅으로 돌아가기 (대화는 그대로) · onFinish(): 설명 마치기
 */
export default function VoiceMode({
  student,
  concept,
  elapsed,
  ttsEnabled,
  ttsRate,
  onUserTurn,
  onClose,
  onFinish,
}) {
  // connecting | listening | thinking | speaking | muted | error
  const [phase, setPhase] = useState('connecting')
  const [live, setLive] = useState('') // 내가 말하는 중인 자막
  const [reply, setReply] = useState(null) // 민지의 마지막 말
  const [captions, setCaptions] = useState(true)
  const [hint, setHint] = useState('')
  const [error, setError] = useState(null)

  const streamRef = useRef(null)
  const tokenRef = useRef(0) // 단계가 바뀌면 이전 콜백(말하기 끝 등)을 무시해요
  const mutedRef = useRef(false)
  const busyRef = useRef(false)
  const { levelRef, attach, detach } = useMicLevel()
  const recorder = useRecorder()

  const hintTimer = useRef(0)
  const flashHint = (text) => {
    setHint(text)
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setHint(''), 3200)
  }

  const listen = useCallback(() => {
    const token = ++tokenRef.current
    busyRef.current = false
    if (mutedRef.current) return setPhase('muted')
    setLive('')
    setPhase('listening')
    recorder.start(streamRef.current)
    dictationRef.current.start()
    return token
  }, [])

  const commit = useCallback(
    async (text) => {
      if (busyRef.current || !text.trim()) return
      busyRef.current = true
      const token = ++tokenRef.current
      dictationRef.current.abort()
      setLive(text)
      setPhase('thinking')
      const audioUrl = await recorder.stop()
      let res = null
      try {
        res = await onUserTurn(text, audioUrl, { voice: true })
      } catch (err) {
        flashHint(err?.message ?? '연결이 불안정해요. 다시 말해 주세요.')
      }
      if (token !== tokenRef.current) return
      setLive('')
      if (!res) return listen()
      setReply(res)
      if (ttsEnabled && speechSupport.synthesis) {
        setPhase('speaking')
        speak(res.text, {
          rate: ttsRate,
          onEnd: () => token === tokenRef.current && listen(),
        })
      } else {
        // 음성 읽기를 꺼 두면 자막만 잠깐 보여 주고 다시 들어요
        setPhase('speaking')
        setTimeout(() => token === tokenRef.current && listen(), 2200)
      }
    },
    [listen, onUserTurn, recorder, ttsEnabled, ttsRate],
  )

  const dictation = useDictation({
    silenceMs: 2000,
    onInterim: (t) => setLive(t),
    onSilence: (t) => commit(t),
    onError: (code) => {
      if (code === 'no-speech') flashHint('잘 안 들렸어요. 다시 말하거나 글로 써 주세요.')
      else if (code === 'network') flashHint('연결이 불안정해요. 다시 연결하고 있어요…')
      else if (code === 'not-allowed' || code === 'service-not-allowed')
        setError('마이크 권한이 없어요. 설정에서 마이크를 켜면 말로 설명할 수 있어요.')
    },
  })
  const dictationRef = useRef(dictation)
  dictationRef.current = dictation

  // 열릴 때 마이크 연결 · 닫힐 때 모두 정리
  useEffect(() => {
    let cancelled = false
    if (!speechSupport.recognition) {
      setError(
        '이 브라우저는 받아쓰기를 지원하지 않아요.\n크롬이나 사파리에서 말로 설명할 수 있어요.',
      )
      setPhase('error')
      return
    }
    requestMicStream()
      .then((stream) => {
        if (cancelled) return stopStream(stream)
        streamRef.current = stream
        attach(stream)
        listen()
      })
      .catch((err) => {
        setError(err.message)
        setPhase('error')
      })
    return () => {
      cancelled = true
      tokenRef.current++
      dictationRef.current.abort()
      recorder.stop()
      stopSpeaking()
      detach()
      stopStream(streamRef.current)
    }
  }, [])

  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
    if (next) {
      if (phase === 'listening') {
        tokenRef.current++
        dictation.abort()
        recorder.stop()
        setLive('')
        setPhase('muted')
      }
    } else if (phase === 'muted') listen()
  }

  // 오브 누르기: 말하는 중이면 끊기, 음소거면 켜기
  const onOrb = () => {
    if (phase === 'speaking') {
      stopSpeaking()
      listen()
    } else if (phase === 'muted') toggleMute()
  }

  // 닫기 전에 말하던 내용이 있으면 대화에 남겨요
  const close = async (next) => {
    const pending = dictation.stop()
    tokenRef.current++
    stopSpeaking()
    if (pending && !busyRef.current) {
      const url = await recorder.stop()
      onUserTurn(pending, url, { voice: true, noReply: true })
    }
    next()
  }

  const status = {
    connecting: '마이크를 준비하고 있어요',
    listening: live ? '듣고 있어요' : '편하게 말로 설명해 주세요',
    thinking: `${student.name}가 생각하고 있어요`,
    speaking: `${student.name}가 말하는 중 · 탭해서 끊기`,
    muted: '마이크가 꺼져 있어요 · 탭해서 켜기',
    error: '음성으로 설명할 수 없어요',
  }[phase]

  const showReply = phase === 'speaking' || (phase === 'listening' && !live && reply)

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f3f6fe_55%,#e9efff_100%)]">
      <div className="flex h-dvh w-full max-w-[430px] flex-col px-6 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]">
        {/* 상단 */}
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              {phase !== 'error' && phase !== 'muted' && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-error/60" />
              )}
              <span
                className={`relative inline-flex size-2 rounded-full ${phase === 'muted' ? 'bg-muted' : 'bg-error'}`}
              />
            </span>
            <span className="text-[13px] font-bold tabular-nums text-sub">{fmt(elapsed)}</span>
            {concept && (
              <Chip tone="white" className="border border-line">
                {concept}
              </Chip>
            )}
          </div>
          <button
            type="button"
            onClick={() => close(onFinish)}
            className="rounded-full bg-white px-[14px] py-2 text-[13px] leading-[1.2] font-bold text-primary shadow-[0_2px_10px_rgba(30,40,66,0.08)]"
          >
            설명 마치기
          </button>
        </div>

        <p className="mt-6 text-center text-sm leading-[1.4] font-bold text-sub">
          학생 AI · {student.name}
        </p>

        {/* 오브 */}
        <div className="flex flex-1 flex-col items-center justify-center gap-7">
          <VoiceOrb
            state={phase === 'error' ? 'muted' : phase}
            levelRef={levelRef}
            onClick={onOrb}
            label={status}
          />
          <p
            className="flex min-h-6 items-center gap-2 text-[15px] leading-[1.4] font-medium text-sub"
            aria-live="polite"
          >
            {status}
            {phase === 'thinking' && <TypingDots className="text-primary" />}
          </p>
        </div>

        {/* 자막 */}
        <div className="flex min-h-[148px] flex-col justify-end pb-6" aria-live="polite">
          {error ? (
            <div className="animate-pop-in flex flex-col items-center gap-3 rounded-[18px] bg-white p-5 text-center shadow-[0_8px_30px_rgba(30,40,66,0.08)]">
              <p className="text-sm leading-[1.6] whitespace-pre-line text-ink">{error}</p>
              <button type="button" onClick={onClose} className="text-sm font-bold text-primary">
                글로 설명하기 →
              </button>
            </div>
          ) : captions ? (
            showReply && reply ? (
              <div
                key={reply.text}
                className="animate-pop-in flex flex-col gap-2 rounded-[18px] bg-white p-4 shadow-[0_8px_30px_rgba(30,40,66,0.08)]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-primary">
                    {reply.kind === 'question' ? '잠깐만요!' : student.name}
                  </span>
                  {reply.tag && <Chip tone="secondary">약점 · {reply.tag}</Chip>}
                </div>
                <p className="text-[17px] leading-[1.55] font-medium tracking-[-0.17px]">
                  {reply.text.replace(/^잠깐만요!\s*/, '')}
                </p>
              </div>
            ) : (
              <p
                className={`line-clamp-4 text-center text-[22px] leading-[1.5] font-bold tracking-[-0.44px] ${
                  live ? 'text-ink' : 'text-muted'
                }`}
              >
                {live || (phase === 'listening' ? '“현재완료는 have나 has 뒤에…”' : '')}
              </p>
            )
          ) : null}
          {hint && <p className="mt-3 text-center text-[13px] font-medium text-error">{hint}</p>}
        </div>

        {/* 하단 조작 */}
        <div className="flex items-center justify-center gap-6">
          <RoundButton
            label={captions ? '자막 끄기' : '자막 켜기'}
            onClick={() => setCaptions((v) => !v)}
            active={captions}
          >
            <CaptionIcon size={24} />
          </RoundButton>
          <RoundButton
            label={phase === 'muted' ? '마이크 켜기' : '마이크 끄기'}
            onClick={toggleMute}
            disabled={phase === 'error' || phase === 'connecting'}
            big
            active={phase !== 'muted'}
          >
            {phase === 'muted' ? <MicOffIcon size={28} /> : <MicIcon size={28} />}
          </RoundButton>
          <RoundButton label="음성 대화 끝내기" onClick={() => close(onClose)} danger>
            <XIcon size={24} />
          </RoundButton>
        </div>
        <p className="mt-3 text-center text-xs leading-[1.4] text-muted">
          2초 정도 멈추면 {student.name}에게 전달돼요 · ✕를 누르면 대화 화면으로 돌아가요
        </p>
      </div>
    </div>
  )
}

function RoundButton({ label, onClick, children, big, danger, active, disabled }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 ${
        big ? 'size-[72px]' : 'size-14'
      } ${
        danger
          ? 'bg-error text-white shadow-[0_8px_20px_-6px_rgba(217,80,106,0.6)]'
          : active
            ? 'bg-white text-ink shadow-[0_4px_16px_rgba(30,40,66,0.1)]'
            : 'bg-ink text-white'
      }`}
    >
      {children}
    </button>
  )
}
