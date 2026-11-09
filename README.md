# Frontend

React 모바일 웹앱 · Vite + React + Tailwind CSS v4 + React Router + React Query + Zustand + axios

## 처음 실행

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:5173
```

## 명령어

| 명령              | 설명                  |
| ----------------- | --------------------- |
| `npm run dev`     | 개발 서버             |
| `npm run build`   | 배포용 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기    |
| `npm run lint`    | 코드 검사 (oxlint)    |

## 환경변수 (`.env.local`, git에 올라가지 않음)

| 이름                | 예시                       | 설명                                    |
| ------------------- | -------------------------- | --------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:8080/v1` | 백엔드 API 주소                         |
| `VITE_USE_MOCK`     | `true`                     | `true`면 백엔드 없이 가짜 데이터로 개발 |

- `@/` = `src/` (예: `import useExample from '@/hooks/useExample'`)

## 새 화면 추가 순서

1. `src/api/○○.js` — API 함수 (목 모드 분기)
2. `src/hooks/use○○.js` — `useQuery` / `useMutation`
3. `src/pages/○○Page.jsx` — 화면
4. `src/router.jsx` — 경로 추가

## 협업 규칙

- 브랜치: `main` ← `dev` ← `feat/기능이름`
- 커밋: `feat:` 기능 · `fix:` 버그 · `style:` 스타일 · `refactor:` 리팩터링 · `chore:` 설정
- PR 전 `npm run lint` · `npm run build` 통과 확인

## 배포 (Vercel)

1. Vercel → Add New Project → 이 레포 Import (Framework: Vite 자동 인식)
2. Root Directory가 레포 최상위가 아니면 이 폴더로 지정
3. Environment Variables에 `VITE_API_BASE_URL`, `VITE_USE_MOCK` 입력
4. `vercel.json`이 새로고침 404를 막아 줘요
