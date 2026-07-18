# pi-web

pi 코딩 에이전트용 웹 UI (OpenWebUI 스타일). 모바일 지원.

## 스택

- **서버**: Node + [pi SDK](https://pi.dev) (`@earendil-works/pi-coding-agent`) + WebSocket (`ws`)
- **프론트**: React 19 + TanStack Router / Query + Base UI + Tailwind CSS v4 + Vite

## 실행

```bash
npm install

# 개발 (서버:3141 + vite:5173, /api·/ws 프록시)
npm run dev
# → http://localhost:5173  (모바일: 같은 네트워크에서 http://<맥IP>:5173)

# 프로덕션
npm run build
npm start
# → http://localhost:3141
```

## 환경변수

- `PORT`: 서버 포트 (기본 3141)
- `PI_WEB_CWD`: 에이전트가 작업할 디렉토리 (기본: 실행 위치)

인증은 pi CLI와 동일하게 `~/.pi/agent/auth.json`을 사용합니다. 먼저 `pi`를 한 번 실행해 로그인/API 키 설정이 되어 있어야 합니다.

## 구조

```
server/index.ts      pi 세션 런타임 + HTTP API + WebSocket
server/serialize.ts  AgentMessage → UI 메시지 직렬화
shared/protocol.ts   서버/클라이언트 공용 타입
src/lib/chat.ts      WebSocket 클라이언트 + 상태 스토어
src/lib/api.ts       TanStack Query 훅 (/api/sessions, /api/models)
src/components/      채팅 UI (Base UI Menu/Dialog + Tailwind)
```

## 기능

- 실시간 스트리밍 (text / thinking 델타)
- **마크다운 렌더링** (react-markdown + GFM + highlight.js 코드 하이라이팅)
- 툴 실행 표시 (bash, edit, read, ...) + 결과 펼쳐보기
- 세션 목록 / 전환 / 새 세션 (pi CLI 세션과 공유됨)
- **세션 포크**: 특정 유저 메시지 지점에서 새 세션 분기 (`runtime.fork()`), 해당 메시지가 입력창에 재주입됨
- 모델 전환 + **thinking level 전환** (모델별 지원 레벨 자동 필터)
- **이미지 첨부**: 파일 선택 / 클립보드 붙여넣기, 미리보기 후 전송
- **다크/라이트 모드 토글** (기본: 시스템 설정 추종, 선택 시 localStorage 저장)
- 스트리밍 중 메시지 전송 → steering
- 중단 (abort)
- 모바일: safe-area, dvh 레이아웃, 세션 드로어
```
