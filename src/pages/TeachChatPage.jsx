import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCK } from '@/api/client'
import ApiState from '@/components/ApiState'
import Button from '@/components/Button'
import Chip from '@/components/Chip'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  StopIcon,
  WaveIcon,
  WifiOffIcon,
} from '@/components/icons'
import Logo from '@/components/Logo'
import { Modal, toast } from '@/components/Overlay'
import Screen from '@/components/Screen'
import MicWave, { TypingDots } from '@/components/voice/MicWave'
import VoiceMode from '@/components/voice/VoiceMode'
import { REVIEW_ITEMS, WEAKNESSES } from '@/data/flow'
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
import {
  useAbandonSession,
  useDday,
  useSendTeachbackMessage,
  useTeachbackMessages,
  useTeachbackSession,
} from '@/hooks/useStudyApi'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { STUDENT_GREETING, studentReply } from '@/utils/studentAI'

const STUDENT = { name: '민지', type: '처음 배우는 학생' }
const STORE_KEY = 'teach-chat-v2'
const BACKEND_MAX_QUESTIONS = 3 // 현재 백엔드는 질문 3개 뒤 final-answer 로 받아요 (기획은 무제한)

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let seq = 0
const uid = () => `m${Date.now()}-${seq++}`

// 저장된 목 대화 · 모양이 다르면(예전 버전 등) 버려요
function loadSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY))
    return Array.isArray(saved?.messages) && saved.ai ? saved : null
  } catch {
    return null
  }
}

// API 메시지 → 말풍선 (내 설명 이후의 AI 메시지는 질문 카드로 보여요)
function toBubbles(messages = []) {
  let userSeen = false
  return [...messages]
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .map((m) => {
      if (m.role === 'user') {
        userSeen = true
        return { id: m.id, from: 'me', text: m.content, voice: m.input_mode === 'voice_transcript' }
      }
      return {
        id: m.id,
        from: 'student',
        text: m.content,
        kind: userSeen ? 'question' : 'greeting',
      }
    })
}

// A-05 설명 · 말과 글, 중간 질문 (11 대체)
export default function TeachChatPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const isRetry = params.get('retry') === '1'
  const dday = useDday()

  const sessionId = useStudyStore((s) => s.sessionId)
  const session = useTeachbackSession()
  const messagesQuery = useTeachbackMessages()
  const send = useSendTeachbackMessage()
  const abandon = useAbandonSession() // PATCH /teachback-sessions/{id} status=abandoned
  const { ttsEnabled, ttsRate, set: setSettings } = useSettingsStore()

  const concept = USE_MOCK ? '현재완료' : (state?.conceptName ?? '')
  const weak = state?.weak ?? WEAKNESSES.map((w) => w.name)

  // ── 대화 상태 (목 모드는 이 화면에서 직접, 실제 모드는 서버 메시지) ──
  const [mock, setMock] = useState(() => {
    // 재설명(?retry=1)이면 저장된 대화를 쓰지 않고 새로 시작해요
    // (예전엔 `!isRetry && loadSaved()` 가 false 를 돌려줘서 `?? 기본값` 이 적용되지 않았어요)
    const saved = isRetry ? null : loadSaved()
    return (
      saved ?? {
        messages: [
          { id: uid(), from: 'student', kind: 'greeting', text: STUDENT_GREETING(concept) },
        ],
        ai: { asked: [], weak, mode: 'explaining' },
      }
    )
  })
  const [audioById, setAudioById] = useState({}) // 다시 듣기용 녹음 (새로고침하면 사라져요)
  const [thinking, setThinking] = useState(false)
  const [pendingText, setPendingText] = useState(null)
  const [draft, setDraft] = useState('')
  const [voiceDraft, setVoiceDraft] = useState(null) // { url } 마이크로 받아쓴 초안
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec] = useState(0)
  const [micDenied, setMicDenied] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [modal, setModal] = useState(null) // 'finish' | 'leave'
  const [playing, setPlaying] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pinOpen, setPinOpen] = useState(true)

  const mockRef = useRef(mock)
  mockRef.current = mock
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const streamRef = useRef(null)
  const audioRef = useRef(null)
  const { levelRef, attach, detach } = useMicLevel()
  const recorder = useRecorder()
  const dictation = useDictation({
    onInterim: (t) => setDraft(t),
    onError: (code) => {
      if (code === 'no-speech') toast('잘 안 들렸어요. 다시 말하거나 글로 써 주세요.')
      else if (code === 'not-allowed') setMicDenied(true)
      else if (code === 'network') toast('연결이 불안정해요. 받아쓰기를 다시 시작해 주세요.')
    },
  })

  // 메시지가 아직 없거나 응답이 비어도 빈 배열로 (API 는 unwrapList 로 { data } → items 를 꺼내요)
  const messages = (USE_MOCK ? mock?.messages : toBubbles(messagesQuery.data ?? [])) ?? []
  const questionCount = messages.filter((m) => m.kind === 'question').length
  const last = messages[messages.length - 1]
  const status = USE_MOCK ? 'active' : session.data?.status
  const busy = thinking || send.isPending
  // 명세: 질문 3개 뒤 마지막 답(final-answer)을 저장하면 더 보낼 수 없고 complete 만 가능해요
  const answersDone =
    !USE_MOCK && (session.data?.question_count ?? 0) >= BACKEND_MAX_QUESTIONS && last?.from === 'me'
  const canType = status === 'active' && !busy && !answersDone

  // 경과 시간 · 네트워크 상태
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      clearInterval(t)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // 녹음 시간
  useEffect(() => {
    if (!recording) return
    setRecSec(0)
    const t = setInterval(() => setRecSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [recording])

  // 대화 저장 ('지금까지의 대화는 저장돼요')
  useEffect(() => {
    if (USE_MOCK) sessionStorage.setItem(STORE_KEY, JSON.stringify(mock))
  }, [mock])

  // 새 메시지가 오면 아래로
  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, thinking, pendingText])

  // 화면을 떠나면 소리·마이크 정리
  useEffect(
    () => () => {
      stopSpeaking()
      audioRef.current?.pause()
      stopStream(streamRef.current)
    },
    [],
  )

  const header = { title: '설명하기', dday }
  if (!USE_MOCK && (!session.data || !messagesQuery.data)) {
    return (
      <Screen header={header}>
        <ApiState
          query={sessionId ? session : undefined}
          empty="진행 중인 설명이 없어요."
          action={{ label: '설명 준비하기', to: '/teach/prepare' }}
        />
      </Screen>
    )
  }

  /**
   * 한 턴 보내기 (글 · 마이크 · 음성 대화 모드 공통)
   * → 학생의 답 { text, tag, kind } 또는 null
   */
  async function sendTurn(
    text,
    { voice = false, audioUrl = null, noReply = false, fromVoiceMode = false } = {},
  ) {
    const id = uid()
    if (audioUrl) setAudioById((a) => ({ ...a, [id]: audioUrl }))

    if (USE_MOCK) {
      setMock((m) => ({ ...m, messages: [...m.messages, { id, from: 'me', text, voice }] }))
      if (noReply) return null
      setThinking(true)
      await wait(900 + Math.random() * 700)
      const reply = studentReply(text, mockRef.current.ai)
      setMock((m) => ({
        ai: reply.nextState,
        messages: [
          ...m.messages,
          { id: uid(), from: 'student', kind: reply.kind, text: reply.text, tag: reply.tag },
        ],
      }))
      mockRef.current = { ...mockRef.current, ai: reply.nextState }
      setThinking(false)
      if (!fromVoiceMode && ttsEnabled && reply) speak(reply.text, { rate: ttsRate })
      return reply
    }

    // 실제 API
    // 마지막 답을 이미 보냈으면 다시 보내지 않고 마치기로 안내해요 (재제출은 409)
    if (answersDone) {
      endAnswering()
      return null
    }
    const isFinal = (session.data?.question_count ?? 0) >= BACKEND_MAX_QUESTIONS
    setPendingText(text)
    try {
      try {
        await send.mutateAsync({
          sessionId,
          content: text,
          isFinal,
          inputMode: voice ? 'voice_transcript' : 'text',
        })
      } catch (err) {
        // 마지막 답이 이미 저장된 상태(409) → 저장된 것으로 보고 마치기로 넘어가요
        if (!(isFinal && err?.status === 409)) throw err
      }
      if (isFinal) {
        await messagesQuery.refetch()
        endAnswering()
        return null
      }
      const { data } = await messagesQuery.refetch()
      const sorted = [...(data ?? [])].sort((a, b) => a.sequence_no - b.sequence_no)
      const lastMsg = sorted[sorted.length - 1]
      if (!lastMsg || lastMsg.role === 'user' || noReply) return null
      const reply = { text: lastMsg.content, kind: 'question' }
      if (!fromVoiceMode && ttsEnabled) speak(reply.text, { rate: ttsRate })
      return reply
    } finally {
      setPendingText(null)
    }
  }

  // 질문 3개에 모두 답함 → 음성 모드를 닫고 '설명 마치기' 확인을 띄워요
  function endAnswering() {
    stopSpeaking()
    if (recording) dictation.abort()
    setVoiceOpen(false)
    setModal('finish')
  }

  // ── 글/마이크 입력 ──
  const startRecording = async () => {
    if (!speechSupport.recognition)
      return toast('이 브라우저는 받아쓰기를 지원하지 않아요. 글로 설명해 주세요.')
    stopSpeaking()
    try {
      const stream = await requestMicStream()
      streamRef.current = stream
      attach(stream)
      recorder.start(stream)
      dictation.start(draft)
      setRecording(true)
    } catch (err) {
      setMicDenied(err.code === 'DENIED')
      toast(err.message)
    }
  }

  const stopRecording = async () => {
    const text = dictation.stop()
    setRecording(false)
    const url = await recorder.stop()
    detach()
    stopStream(streamRef.current)
    streamRef.current = null
    if (!text) {
      toast('잘 안 들렸어요. 다시 말하거나 글로 써 주세요.')
      return
    }
    setDraft(text)
    setVoiceDraft({ url })
    // 받아쓴 내용은 보내기 전에 고칠 수 있어요
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const onSend = async (e) => {
    e?.preventDefault()
    if (recording) await stopRecording()
    const text = draft.trim()
    if (!text || !canType) return
    const v = voiceDraft
    setDraft('')
    setVoiceDraft(null)
    try {
      await sendTurn(text, { voice: !!v, audioUrl: v?.url })
    } catch (err) {
      toast(err.message ?? '보내지 못했어요. 다시 시도해 주세요.')
      setDraft(text)
    }
  }

  const onContinue = () => {
    setMock((m) => ({
      ...m,
      messages: [...m.messages, { id: uid(), from: 'system', text: '설명을 이어가요' }],
    }))
    inputRef.current?.focus()
  }

  // ── 다시 듣기 ──
  const play = (m) => {
    stopSpeaking()
    audioRef.current?.pause()
    if (playing === m.id) return setPlaying(null)
    const url = audioById[m.id]
    setPlaying(m.id)
    if (url) {
      const a = new Audio(url)
      audioRef.current = a
      a.onended = () => setPlaying(null)
      a.play().catch(() => setPlaying(null))
    } else {
      speak(m.text, { rate: ttsRate, onEnd: () => setPlaying((p) => (p === m.id ? null : p)) })
    }
  }

  const toggleTts = () => {
    if (ttsEnabled) stopSpeaking()
    setSettings({ ttsEnabled: !ttsEnabled })
    toast(ttsEnabled ? '학생 질문을 소리 없이 보여 줘요' : '학생 질문을 음성으로 읽어 줘요')
  }

  const openVoice = () => {
    if (micDenied)
      return toast('마이크 권한이 없어요. 설정에서 마이크를 켜면 말로 설명할 수 있어요.')
    if (recording) dictation.abort()
    stopSpeaking()
    setVoiceOpen(true)
  }

  const finish = () => {
    stopSpeaking()
    sessionStorage.removeItem(STORE_KEY)
    navigate('/teach/analyzing')
  }

  const showContinue = USE_MOCK && last?.from === 'student' && last.kind === 'ack' && !busy

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-white">
      {/* 상단 바 */}
      <header className="flex items-center gap-2 border-b border-line px-3 pt-2 pb-[10px]">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => setModal('leave')}
          className="flex size-10 items-center justify-center rounded-full hover:bg-cool"
        >
          <ChevronLeftIcon size={24} />
        </button>
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <Logo variant="mascot" />
          <span className="absolute right-0 bottom-0 size-[10px] rounded-full border-2 border-white bg-[#3cc68a]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-[1.35]">
          <p className="text-[15px] font-bold tracking-[-0.15px]">학생 AI · {STUDENT.name}</p>
          <p className="truncate text-xs text-sub">
            {concept && `${concept} · `}
            <span className="tabular-nums">{fmt(elapsed)}</span>
            {questionCount > 0 && ` · 질문 ${questionCount}`}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTts}
          aria-label={ttsEnabled ? '학생 질문 음성 끄기' : '학생 질문 음성 켜기'}
          aria-pressed={ttsEnabled}
          className={`flex size-10 items-center justify-center rounded-full ${ttsEnabled ? 'text-primary hover:bg-primary-soft' : 'text-muted hover:bg-cool'}`}
        >
          {ttsEnabled ? <SpeakerIcon size={22} /> : <SpeakerOffIcon size={22} />}
        </button>
        {dday && <Chip className="mr-1">{dday}</Chip>}
      </header>

      {!online && (
        <p className="flex items-center gap-2 bg-error-soft px-5 py-2 text-[13px] font-medium text-error">
          <WifiOffIcon size={16} /> 연결이 끊겼어요. 다시 연결되면 이어서 보낼 수 있어요.
        </p>
      )}

      {/* 재설명일 때 보완할 점 고정 카드 */}
      {isRetry && (
        <div className="border-b border-line bg-primary-soft/60 px-5 py-3">
          <button
            type="button"
            onClick={() => setPinOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[13px] font-bold text-primary"
          >
            지난 설명에서 보완할 점 {REVIEW_ITEMS.length}가지
            <ChevronDownIcon size={18} className={`transition ${pinOpen ? 'rotate-180' : ''}`} />
          </button>
          {pinOpen && (
            <ul className="mt-2 flex flex-col gap-[6px]">
              {REVIEW_ITEMS.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-[13px] leading-[1.45]">
                  <Chip tone={r.tone}>{r.verdict}</Chip>
                  <span className="truncate">{r.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 대화 */}
      <ul ref={listRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <li className="self-center rounded-full bg-cool px-3 py-1 text-[11px] font-medium text-sub">
          학생은 정답을 먼저 알려주지 않아요
          {!USE_MOCK && ` · 질문은 최대 ${BACKEND_MAX_QUESTIONS}개`}
        </li>
        {messages.map((m) => {
          if (m.from === 'system') {
            return (
              <li key={m.id} className="flex items-center gap-3 text-[11px] font-bold text-muted">
                <span className="h-px flex-1 bg-line" />
                {m.text}
                <span className="h-px flex-1 bg-line" />
              </li>
            )
          }
          if (m.from === 'student' && m.kind === 'question') {
            return (
              <li key={m.id} className="animate-pop-in flex gap-2">
                <Avatar />
                <div className="flex max-w-[300px] flex-col gap-2 rounded-tl-[4px] rounded-tr-2xl rounded-b-2xl border-[1.5px] border-primary/25 bg-white px-[14px] py-3 shadow-[0_4px_16px_-6px_rgba(63,114,224,0.25)]">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[13px] font-bold text-primary">잠깐만요!</span>
                    {m.tag && <Chip tone="secondary">약점 · {m.tag}</Chip>}
                  </div>
                  <p className="text-[15px] leading-[1.6]">{m.text.replace(/^잠깐만요!\s*/, '')}</p>
                  <PlayButton
                    active={playing === m.id}
                    onClick={() => play(m)}
                    label="질문 다시 듣기"
                  />
                </div>
              </li>
            )
          }
          if (m.from === 'student') {
            return (
              <li key={m.id} className="animate-pop-in flex gap-2">
                <Avatar />
                <div className="flex flex-col items-start gap-1">
                  <p className="max-w-[290px] rounded-tl-[4px] rounded-tr-2xl rounded-b-2xl bg-cool px-[14px] py-3 text-[15px] leading-[1.6]">
                    {m.text}
                  </p>
                  <PlayButton
                    active={playing === m.id}
                    onClick={() => play(m)}
                    label="다시 듣기"
                    subtle
                  />
                </div>
              </li>
            )
          }
          return (
            <li key={m.id} className="animate-pop-in flex flex-col items-end gap-1">
              <p className="max-w-[290px] rounded-tl-2xl rounded-tr-[4px] rounded-b-2xl bg-primary px-[14px] py-3 text-[15px] leading-[1.6] text-white">
                {m.text}
              </p>
              {m.voice && (
                <span className="flex items-center gap-2 text-[11px] font-medium text-muted">
                  <MicIcon size={12} /> 음성 · 받아쓰기
                  <PlayButton
                    active={playing === m.id}
                    onClick={() => play(m)}
                    label="내 설명 다시 듣기"
                    subtle
                  />
                </span>
              )}
            </li>
          )
        })}
        {pendingText && (
          <li className="flex justify-end">
            <p className="max-w-[290px] rounded-tl-2xl rounded-tr-[4px] rounded-b-2xl bg-primary/60 px-[14px] py-3 text-[15px] leading-[1.6] text-white">
              {pendingText}
            </p>
          </li>
        )}
        {busy && (
          <li className="flex items-center gap-2">
            <Avatar />
            <span className="flex items-center gap-2 rounded-2xl bg-cool px-4 py-3 text-sub">
              <TypingDots />
            </span>
          </li>
        )}
        {answersDone && !busy && (
          <li className="flex items-center gap-3 text-[11px] font-bold text-muted">
            <span className="h-px flex-1 bg-line" />
            설명이 끝났어요
            <span className="h-px flex-1 bg-line" />
          </li>
        )}
        {showContinue && (
          <li className="flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="animate-pop-in rounded-full border border-primary/30 bg-primary-soft px-4 py-2 text-[13px] font-bold text-primary"
            >
              설명 이어가기 →
            </button>
          </li>
        )}
      </ul>

      {/* 입력 영역 */}
      <div className="border-t border-line bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        {answersDone ? (
          // 설명 끝 · 입력창 · 계속 설명하기 · 중단하기 없이 리포트로만 안내
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 rounded-[14px] bg-primary-soft px-4 py-3 text-center">
              <p className="text-[15px] leading-[1.4] font-bold text-primary">설명이 끝났어요</p>
              <p className="text-[13px] leading-[1.5] text-sub">
                {STUDENT.name}의 질문 {questionCount}개에 모두 답했어요. 리포트에서 잘한 점과 보완할
                점을 확인해 보세요.
              </p>
            </div>
            <Button className="h-12 text-[15px]" onClick={finish}>
              리포트 받기
            </Button>
          </div>
        ) : (
          <>
            {micDenied && (
              <p className="mb-2 text-xs leading-[1.5] text-sub">
                글로 설명할 수 있어요. 설정에서 마이크를 켜면 말로도 설명할 수 있어요.
              </p>
            )}
            {recording && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-error/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-error" />
                </span>
                <span className="text-xs font-bold text-primary tabular-nums">
                  듣고 있어요 {fmt(recSec)}
                </span>
                <MicWave levelRef={levelRef} className="flex-1 justify-end overflow-hidden" />
              </div>
            )}
            {voiceDraft && !recording && (
              <p className="mb-2 text-xs text-sub">받아쓴 내용을 고친 뒤 보낼 수 있어요.</p>
            )}
            <form onSubmit={onSend} className="flex items-end gap-2">
              {!micDenied && (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!canType}
                  aria-label={recording ? '받아쓰기 끝내기' : '말로 입력하기'}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                    recording ? 'bg-error text-white' : 'bg-cool text-ink hover:bg-line'
                  }`}
                >
                  {recording ? <StopIcon size={20} /> : <MicIcon size={22} />}
                </button>
              )}
              <div className="flex min-h-11 flex-1 items-end rounded-[22px] bg-cool px-4 py-[10px]">
                <textarea
                  ref={inputRef}
                  value={draft}
                  rows={1}
                  readOnly={recording}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) onSend(e)
                  }}
                  placeholder={
                    recording
                      ? '말하는 내용을 받아쓰고 있어요…'
                      : `${STUDENT.name}에게 설명해 주세요`
                  }
                  className="max-h-32 min-h-6 w-full resize-none bg-transparent text-[15px] leading-[1.5] outline-none placeholder:text-muted"
                  style={{ fieldSizing: 'content' }}
                />
              </div>
              {draft.trim() ? (
                <button
                  type="submit"
                  disabled={!canType}
                  aria-label="보내기"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
                >
                  <SendIcon size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openVoice}
                  disabled={!canType}
                  aria-label="음성 대화 모드"
                  title="음성 대화 모드"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40"
                >
                  <WaveIcon size={20} />
                </button>
              )}
            </form>
            <Button
              variant="secondary"
              className="mt-3 h-12 text-[15px]"
              onClick={() => setModal('finish')}
            >
              설명 마치기
            </Button>
            {!USE_MOCK && (
              <button
                type="button"
                onClick={() => setModal('abandon')}
                disabled={busy}
                className="mt-2 w-full text-center text-xs font-bold text-muted underline disabled:opacity-40"
              >
                이번 설명 중단하기
              </button>
            )}
          </>
        )}
      </div>

      {voiceOpen && (
        <VoiceMode
          student={STUDENT}
          concept={concept}
          elapsed={elapsed}
          ttsEnabled={ttsEnabled}
          ttsRate={ttsRate}
          onUserTurn={(text, audioUrl, opt) =>
            sendTurn(text, { ...opt, audioUrl, fromVoiceMode: true })
          }
          onClose={() => setVoiceOpen(false)}
          onFinish={() => {
            setVoiceOpen(false)
            setModal('finish')
          }}
        />
      )}

      {/* 질문에 모두 답했으면 더 설명할 수 없으니 '계속 설명하기' 없이 리포트로만 안내해요 */}
      <Modal
        open={modal === 'finish'}
        title={answersDone ? '설명이 끝났어요' : '설명을 마칠까요?'}
        desc={
          answersDone
            ? `${STUDENT.name}의 질문 ${questionCount}개에 모두 답했어요.\n설명을 분석해 약점 리포트를 만들어요.`
            : `학생 질문 ${questionCount}개에 답했어요.\n설명을 분석해 약점 리포트를 만들어요.`
        }
        confirmLabel={answersDone ? '리포트 받기' : '설명 마치기'}
        cancelLabel={answersDone ? null : '계속 설명하기'}
        onConfirm={finish}
        onClose={() => setModal(null)}
      />
      <Modal
        open={modal === 'abandon'}
        title="이번 설명을 중단할까요?"
        desc="대화 기록은 남지만 리포트는 만들지 않아요."
        confirmLabel="중단하기"
        danger
        onConfirm={() =>
          abandon.mutate(sessionId, {
            onSuccess: () => {
              stopSpeaking()
              navigate('/today')
            },
            onError: (err) => {
              setModal(null)
              toast(err.message)
            },
          })
        }
        onClose={() => setModal(null)}
      />
      <Modal
        open={modal === 'leave'}
        title="설명을 그만둘까요?"
        desc="지금까지의 대화는 저장돼요."
        confirmLabel="그만두기"
        cancelLabel="계속하기"
        onConfirm={() => {
          stopSpeaking()
          navigate('/teach/prepare')
        }}
        onClose={() => setModal(null)}
      />
    </div>
  )
}

function Avatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
      <span className="scale-75">
        <Logo variant="mascot" />
      </span>
    </span>
  )
}

function PlayButton({ active, onClick, label, subtle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1 self-start text-[11px] font-bold ${
        subtle ? 'text-muted hover:text-sub' : 'rounded-full bg-primary-soft px-2 py-1 text-primary'
      }`}
    >
      {active ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
      {subtle ? '' : active ? '멈추기' : '다시 듣기'}
    </button>
  )
}
