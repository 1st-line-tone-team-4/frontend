import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Screen from '@/components/Screen'
import Button from '@/components/Button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAiStore } from '@/stores/useAiStore'
import { getMe, listModels, validateAiKey } from '@/api/study'
import { createIdempotencyKey, captureSession, assertSession } from '@/api/client'

const testLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'
export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const authenticated = useAuthStore((s) => Boolean(s.accessToken))
  const { modelId, providerApiKey, setModel, setKey } = useAiStore()
  const [token, setToken] = useState('')
  const [keyDraft, setKeyDraft] = useState('')
  const [models, setModels] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [validationKey, setValidationKey] = useState(null)
  const next = params.get('next')
  const destination =
    next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/today'
  async function signIn() {
    setBusy(true)
    let version
    const submittedToken = token
    setToken('')
    try {
      useAuthStore.getState().setToken(submittedToken)
      version = captureSession()
      await getMe()
      assertSession(version)

      setMessage('테스트 인증이 확인됐어요. AI 모델과 키는 아래에서 설정하세요.')
    } catch (error) {
      if (version !== undefined) useAuthStore.getState().logoutIfCurrent(version)
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  async function loadModels() {
    setBusy(true)
    try {
      setModels(await listModels())
      setMessage('사용 가능한 모델을 불러왔어요.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  async function validate() {
    setBusy(true)
    if (keyDraft) {
      setKey(keyDraft)
      setKeyDraft('')
    }
    const key = validationKey ?? createIdempotencyKey()
    setValidationKey(key)
    try {
      const result = await validateAiKey({ idempotencyKey: key, modelId })
      setMessage(
        result.valid ? '키 검증이 완료됐어요.' : '키가 유효하지 않아요. 제공자와 키를 확인하세요.',
      )
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen className="gap-5 p-6">
      <h1 className="text-2xl font-bold">로그인 및 AI 연결</h1>
      <p>소셜·이메일 로그인은 아직 연결되지 않았어요. 인증 제공자 설정이 필요해요.</p>
      {testLoginEnabled && !authenticated && (
        <section className="flex flex-col gap-3">
          <label htmlFor="test-token">로컬 테스트용 액세스 토큰</label>
          <input
            id="test-token"
            disabled={busy}
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="rounded border p-3"
          />
          <Button onClick={signIn} disabled={busy || !token.trim()}>
            테스트 인증 확인
          </Button>
          <p className="text-sm">토큰은 이 탭의 메모리에만 보관하며 새로고침하면 지워져요.</p>
        </section>
      )}
      {authenticated && (
        <section className="flex flex-col gap-3">
          <h2 className="font-bold">AI 제공자 설정</h2>
          <Button variant="secondary" onClick={loadModels} disabled={busy}>
            사용 가능한 모델 불러오기
          </Button>
          <label htmlFor="model">AI 모델</label>
          <select
            id="model"
            disabled={busy}
            value={modelId}
            onChange={(e) => {
              setModel(e.target.value)
              setValidationKey(null)
            }}
            className="rounded border p-3"
          >
            <option value="">모델 선택</option>
            {models
              .filter((m) => m.available)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label ?? m.id}
                </option>
              ))}
          </select>
          {providerApiKey && <p role="status">키 설정됨</p>}
          <label htmlFor="provider-key">선택한 AI 제공자의 API 키</label>
          <input
            id="provider-key"
            disabled={busy}
            type="password"
            autoComplete="off"
            value={keyDraft}
            onChange={(e) => {
              setKeyDraft(e.target.value)
              setValidationKey(null)
            }}
            className="rounded border p-3"
          />
          <p className="text-sm">
            키는 메모리에만 보관돼요. 검증 및 AI 작업 요청 시 백엔드와 선택한 제공자에 전달돼요. AI
            학습 작업에는 제공자 요금이 발생할 수 있어요.
          </p>
          <Button
            variant="secondary"
            onClick={validate}
            disabled={busy || !modelId || (!providerApiKey && !keyDraft)}
          >
            키 검증
          </Button>
          <Button onClick={() => navigate(destination)} disabled={busy}>
            계속하기
          </Button>
          <Button variant="secondary" onClick={() => useAuthStore.getState().logout()}>
            로그아웃
          </Button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </Screen>
  )
}
