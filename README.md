# 1호선톤 Frontend · 최신 UI / Backend 통합

최신 화면을 실제 Backend의 개인 학습 API에 연결한 로컬 통합 브랜치입니다. 화면 디자인과 별도 시안 모드는 유지하며, 실제 모드에서 샘플 성적·원문·제출 성공을 사용자 데이터처럼 표시하지 않습니다.

## 실행

Node 버전은 `.nvmrc`를 따릅니다.

```sh
npm ci --ignore-scripts
npm run dev
```

- API 기본 주소: `/v1`.
- Vite: `http://127.0.0.1:5173`, `/v1`과 `/health`를 `BACKEND_PROXY_TARGET`으로 프록시합니다. 기본 Backend는 `http://127.0.0.1:8000`입니다.
- Backend의 `PUBLIC_BASE_URL`도 프론트 공개 origin인 `http://127.0.0.1:5173`으로 맞춰 signed upload가 같은 proxy를 통과하게 해야 합니다.
- `.env.example`을 참고하세요. `VITE_*`에는 토큰·API 키·서버 비밀값을 넣지 않습니다.
- `VITE_USE_MOCK=true`는 명시적인 디자인 미리보기입니다. 실제 API 검증은 반드시 `false`로 실행합니다.

## 인증과 AI

현재 Backend는 외부 제공자의 RS256 JWT를 검증하며 로그인/토큰 발급 API를 제공하지 않습니다. **실제 소셜·이메일 로그인 제공자 설정은 아직 필요합니다.** 로그인 화면은 연결되지 않은 기능을 성공으로 처리하지 않습니다.

로컬 통합 테스트에는 개발 서버에서만 `VITE_ENABLE_TEST_LOGIN=true`로 합성 테스트 토큰 입력을 켤 수 있습니다. production build에서는 이 입력이 제거됩니다. JWT와 BYOK는 탭의 메모리에만 보관하고, 로그아웃/계정 전환/새로고침 시 지웁니다. 이전 localStorage 인증 데이터도 사용하지 않습니다.

로그인 화면에서 서버가 허용한 모델을 조회하고 키를 명시적으로 검증합니다. AI 요청은 `model_id`와 `X-AI-Key`를 보내며, 실제 제공자 사용 시 별도 비용이 발생할 수 있습니다. 저장된 설명 조회는 새 AI 생성을 자동으로 시작하지 않습니다.

## 연결된 핵심 흐름

자료 업로드 → 분석 상태/실패 복구 → 시험 목표 → 개념 확인 → 학습 계획 → 단원·원문·자습 설명 → 문제 생성·답안·채점·실제 결과 → Teach-back 3회 질문/마지막 답변 → 리포트·기록·복습 완료.

- 자료/문제/세션/과제 ID를 URL 및 서버 결과에서 확인합니다. 새로고침 후에는 다시 인증하되 해당 URL로 돌아갈 수 있습니다.
- 결과를 확정할 수 없는 POST는 같은 본문·멱등키로 사용자가 다시 확인합니다. 새 키로 자동 생성하지 않습니다.
- Job 조회는 최소 2초 및 `Retry-After`를 따릅니다. 화면의 대기 중단은 서버 Job 취소가 아닙니다.
- `failed`의 허용된 retry와 `outcome_unknown` 등의 restart를 구분하며, restart는 중복 비용 가능성 확인 후에만 실행합니다.
- 원래 모델을 보관하지 못한 재방문 Job은 임의의 현재 모델로 복구하지 않습니다. 서버 Job DTO가 원래 모델을 제공하지 않아 읽기 전용 상태 확인으로 제한될 수 있습니다.
- 회원 탈퇴·비밀번호 변경·공개 문제은행·성적 인증·전체 자료 모의고사·알림 발송은 현재 Backend 계약에 없거나 연결되지 않아 실제 모드에서 미지원으로 안내합니다.

## 검증

```sh
npm test
npm run lint
npm run build
npm run test:browser
```

브라우저 테스트는 설치된 Edge, `playwright-core`, 인접 `../Backend`의 테스트 환경을 사용합니다. `FIXTURE_PYTHON`으로 Backend 의존성이 설치된 Python을 지정할 수 있습니다. 테스트는 실제 loopback HTTP·JWT 검증과 임시 SQLite를 사용하고 AI provider만 합성 대역으로 주입합니다. 실제 AI·운영 DB를 사용하지 않습니다.

실행 산출물 `test-results/`는 Git에서 제외합니다. 테스트 자격 자료는 OS 임시 폴더에만 만들며 종료 시 정리합니다. 자세한 검증 범위와 한계는 [docs/INTEGRATION.md](docs/INTEGRATION.md)를 참고하세요.

## 배포 전

Vite의 개발 proxy는 배포 번들에 포함되지 않습니다. 운영 same-origin reverse proxy 또는 엄격한 CORS 설정, 실제 IdP 설정, 제공자 연결 검증이 별도로 필요합니다. `vercel.json`의 SPA fallback만으로 Backend 라우팅은 완성되지 않습니다. 이 브랜치에서는 배포하거나 원격 push/PR/merge를 수행하지 않았습니다.
