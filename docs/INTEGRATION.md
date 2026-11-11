# Latest UI integration record

## Source boundaries

- Frontend base: `5de8d3d7e15e9bd539160036cf8890d587d9c32b`.
- Backend base: `9edda581a98f6e098d321d9130ace0e2291cb751`.
- Backend signed-upload parity patch: `07779a6fcf9e33e06bc26b714360040a08e47f1a`.
- Local branch in each independent repository: `integration/latest-ui-20261110`.
- Previous integration checkouts and unpublished work were preserved. No remote write or deployment is part of this change.

## Contract decisions

The audit found 39 frontend API wrappers whose methods/paths matched the mounted backend, but required model/BYOK fields, authentication, job observation, and actual screen data wiring were incomplete. The backend publishes 51 of 64 canonical public operations plus two implementation-only signed-storage routes. Its checked-in implemented OpenAPI exactly matches its generated publication; generation filters the canonical schema and is not proof of handler schema parity.

The nullable `followup_session_id` field on improvement-action PATCH is required in the public snapshot but optional in the handler. The frontend now sends an explicit value/null. No broad backend contract expansion was made.

The only production backend change is signed-PUT parser parity: a configured document recognizer may accept a structurally valid textless PDF, matching complete/worker preparation. Without that recognizer the original text requirement remains. Upload does not invoke OCR/AI itself. Dedicated tests reject corrupt bytes and retain write-once storage semantics.

## Safety and state invariants

- No authentication or provider credential persistence in browser storage. Sign-out and identity switches clear private caches, resource IDs, operation context and AI settings. Request/response session fences prevent stale account requests from affecting the new login.
- POST operations have caller-retained idempotency keys. Repeated clicks do not create independent requests, and uncertain outcomes have explicit replay/reconciliation paths.
- An upload retains create/PUT/complete stages, material identity and original model in session memory. An uncertain immutable PUT is reconciled by completion/resource state before any further byte transmission. Losing a complete response is not permission to upload again.
- Job observation is cancelable and rate-limit aware. Observation timeout is not server failure. Retry requires the appropriate failed/retryable/attempt state. Restart is explicit and acknowledges duplicate-cost risk. Original model is never silently replaced with current settings.
- Navigation retains recoverable in-session action identity. Hard reload clears authentication and secret-bearing context. URLs restore resource identity after reauthentication; jobs missing original model context are observable but not blindly restarted.
- Live learning, quiz results and evidence use server material/attempt/report data. Missing historic concept versions fail closed instead of silently substituting a different current concept. Separate fixture-only routes are unavailable in live mode.
- Task-linked question counts respect remaining task quota, including partial completion. Free practice is explicitly separate from plan task progress.
- Browser microphone/STT/TTS functionality remains client-side. Backend voice messages send transcribed text with `voice_transcript`; there is no newly invented audio streaming API.

## Validation evidence

Frontend final aggregate: **47/47 unit regressions passed**, with no skipped tests. Coverage includes session fencing, header isolation, all nine AI mutation wrappers, voice-transcript mapping, idempotency, job terminal/recovery states, navigation scopes, explicit plan identity, honest quiz results, task quota and upload uncertainty. These are module/model regressions, not a claim of full UI coverage.

Frontend lint completed with **0 errors and 14 existing warnings**, primarily in voice hooks/components and mock screens. Production build passed (278 modules); its main JavaScript chunk is 753.56 kB before gzip and retains the over-500 kB size warning. Node 26 emitted its experimental localStorage warning during tests.

The final real-screen Edge run passed on 2026-11-10 with no page errors. Historical 2026-11-05 API-module browser checks are not counted as latest UI verification.

Actual clicked UI journeys against the local backend:

- Synthetic JWT authentication, server model selection/key validation, cleared credential inputs, signed file upload, analysis, exam goal, confirmed concepts and generated plan.
- Today → Unit → Learn → Quiz, with a genuine plan GET response delayed by one second. Original task/plan IDs survived every link, the task quota remained five, and exactly five distinct attempt POSTs were graded. One deliberately incorrect answer remained incorrect in the actual saved result.
- Generated grounded explanation, Teach-back's three assistant questions and final answer, generated report, report source open/back, and plan-linked review completion (successful PATCH).
- Report reload followed by reauthentication, saved records, logout and isolation of a different synthetic account.
- A second upload with a genuinely accepted complete response deliberately dropped. Double click plus navigation away/back recovered the original job by GET without a second material or complete request.

Separate render-only smoke checks covered 19 empty-account routes. A 390-pixel viewport had no horizontal overflow. These checks are not claims that every interaction on every screen was exercised.

Fixture shutdown was clean. Synthetic provider counts were analysis=2, explanation=1, questions=1, grade=5, message=3 and report=1. No live AI/provider request was made. The UI journey selected text-only input and disabled question speech; physical microphone, STT and TTS playback were not tested.

Current backend full regression on this change: **614 passed, 1 skipped**, 245.76 seconds. The skipped test requires a disposable MySQL URL; no production database was used. One existing Starlette/httpx test-client deprecation warning remains. The suite includes the three new OCR upload boundary cases.

Backend Ruff lint and format checks passed. The three new OCR tests were rerun after formatting and passed again; formatting did not change runtime code.

The real browser harness runs the actual rendered screens through Vite to the actual backend over loopback with real short-lived JWT verification. Only AI results are replaced by a deterministic test provider. It blocks outside network requests, clears sensitive input drafts, and inspects DOM/storage for test-token or key leaks before capturing screenshots. Its descriptor lives in an OS temporary directory and is removed on shutdown. Artifact output is ignored by Git.

## Not verified / external prerequisites

- Production IdP login/refresh/onboarding, live provider quality or billing, real external OCR service, production deployment/CORS/proxy/load.
- Disposable MySQL locking/migrations in this local run.
- Physical microphone, speech-recognition provider behavior, audio playback across browser/device variants. Existing speech/UI lint warnings are not proof of tested voice behavior.
- Unsupported publication/score-claim/billing APIs, account deletion/profile/password updates, remote notification delivery, full-material mock-exam workflow.
- Historical concept versions not supplied by current material/plan context display an explicit unavailable state rather than unverified source content.

No secrets, descriptor contents, screenshots or runtime logs belong in a commit. Use `git status --short --ignored` and review the actual staged file list before publication. Remote publication requires separate authorization.
