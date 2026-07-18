# pi-web HANDOFF

> 작성일: 2026-07-18 · 브랜치 `main` · 최신 커밋 `5134819`

pi 코딩 에이전트용 웹 UI (OpenWebUI 스타일, 모바일 지원). 이 문서는 다음 작업자를 위한 인수인계 문서다.

---

## 1. 빠른 시작

```bash
npm install
npm run dev            # 서버(3141) + vite(5173) 동시 실행 → http://localhost:5173
npm run build && npm start   # 프로덕션 → http://localhost:3141
npm run typecheck      # tsc --noEmit
```

- 인증: pi CLI와 동일한 `~/.pi/agent/auth.json` 사용. **pi를 먼저 설정해둬야 함**
- `PI_WEB_CWD`: 에이전트 작업 디렉토리 (기본: 실행 위치), `PORT`: 서버 포트
- 모바일 테스트: `host: true` 설정되어 있어 같은 네트워크에서 `http://<맥IP>:5173`

## 2. 아키텍처

```
브라우저 (React 19 + TanStack Router/Query + Base UI + Tailwind v4)
   │  WebSocket /ws (스트리밍·커맨드)  +  HTTP /api/* (목록성 데이터)
   ▼
server/index.ts (Node, tsx로 실행)
   │  @earendil-works/pi-coding-agent SDK
   ▼
AgentSessionRuntime ── 세션파일 공유: ~/.pi/agent/sessions (pi CLI와 동일)
```

| 파일 | 역할 |
|---|---|
| `server/index.ts` | pi 세션 런타임, WS 브로드캐스트, 커맨드 처리, HTTP API, 정적 서빙 |
| `server/serialize.ts` | `AgentMessage[]` → `UIMessage[]` (toolCall↔toolResult 페어링, 이미지 dataUrl) |
| `shared/protocol.ts` | **서버/클라 공용 타입. 프로토콜 변경 시 여기부터 수정** |
| `src/lib/chat.ts` | WS 클라이언트 + `useSyncExternalStore` 스토어, 자동 재연결(백오프) |
| `src/lib/api.ts` | TanStack Query 훅: `useSessions` `useModels` `useForkPoints` |
| `src/lib/theme.ts` | 다크/라이트 (class 기반, localStorage, 시스템 추종) |
| `src/components/` | ChatPage(헤더 조립), MessageList, Composer, Markdown, ModelMenu, ThinkingMenu, ForkMenu, SessionsDrawer, ThemeToggle |

### 핵심 동작 원리

- **스냅샷 + 델타 하이브리드**: 텍스트/thinking은 델타 스트리밍, 완결 메시지는
  `message_end` / `tool_execution_end` / `agent_end` 시점에 전체 스냅샷 브로드캐스트.
  클라이언트는 스냅샷 수신 시 스트림 버퍼를 비운다 (`chat.ts`의 `handle()`).
- **세션 교체 시 재구독 필수**: `runtime.newSession()/switchSession()/fork()` 후
  `runtime.session`이 교체되므로 반드시 `bindSession()` 재호출 (server/index.ts).
- **스트리밍 중 prompt → steering**: 서버가 `session.isStreaming`이면
  `streamingBehavior: "steer"`를 자동으로 붙임.
- **fork 흐름**: `/api/fork-points`(= `getUserMessagesForForking()`) → WS `fork` 커맨드
  → `runtime.fork(entryId)` → `forked` 이벤트의 `selectedText`가 composer에 재주입
  (`chat.ts`의 `injectText` → Composer의 useEffect).
- **thinking level 필터**: 모델의 `reasoning` / `thinkingLevelMap` 메타데이터로
  지원 레벨 계산 (`supportedThinkingLevels()` in server/index.ts). null = 미지원,
  xhigh/max는 명시적 매핑이 있을 때만.

## 3. 완료된 작업

| 커밋 | 내용 |
|---|---|
| `27cfd65` | 초기 스캐폴드: SDK 서버 + WS 프로토콜 + 채팅 UI + 세션/모델 전환 + 모바일 대응 |
| `5134819` | 마크다운 렌더링, 세션 fork UI, thinking level 전환, 이미지 첨부, 다크/라이트 토글 |

기능 상세는 `README.md` 참고. 전부 수동 검증 완료 (typecheck, build, 서버 기동, WS 스냅샷, API 응답).

## 4. TODO (우선순위순)

### P1 — 다음에 바로 할 것

- [ ] **에러 토스트 UI**: 서버 `error` 이벤트가 현재 `console.error`로만 감 (`chat.ts`).
      Base UI Toast 또는 간단한 배너로 표시
- [ ] **세션 이름 변경**: SDK `session.setSessionName(name)` 있음. 드로어에서 인라인 편집 UI
- [ ] **번들 사이즈**: 462kB → 500kB+ 경고. `vite.config.ts`에 `manualChunks`로
      react-markdown/hljs 분리 또는 dynamic import
- [ ] **컨텍스트/비용 표시**: `session.getContextUsage()`, `getSessionStats()` →
      헤더에 토큰 게이지 + 누적 비용. 스냅샷에 필드 추가하면 됨

### P2 — 완성도

- [ ] **멀티 클라이언트 정리**: 지금은 모든 브라우저 탭이 단일 세션을 공유(브로드캐스트).
      탭별 독립 세션이 필요하면 WS 연결별 runtime 맵으로 구조 변경 필요 (큰 작업)
- [ ] **followUp 지원**: 스트리밍 중 전송이 무조건 steer. steer/followUp 선택 UI
      (SDK: `streamingBehavior: "followUp"`)
- [ ] **스냅샷 이미지 최적화**: user 이미지가 스냅샷마다 base64로 통째로 감.
      별도 엔드포인트(`/api/image/:hash`)로 분리하거나 스냅샷에서 축소본만
- [ ] **마크다운 스트리밍 성능**: 델타마다 전체 re-parse. 긴 응답에서 느려지면
      throttle(예: 100ms) 또는 마지막 블록만 재파싱
- [ ] **navigateTree 지원**: fork는 새 파일 생성. 같은 파일 내 브랜치 이동은
      `session.navigateTree(targetId)` — 트리 시각화 UI와 함께
- [ ] **테스트 없음**: serialize.ts(페어링 로직)와 protocol 라운드트립부터 vitest 추가 권장

### P3 — 아이디어

- [ ] PWA (manifest + 홈화면 추가, 오프라인 셸)
- [ ] 세션 HTML 내보내기 (SDK `session.exportToHtml()` 있음)
- [ ] compaction 상태 표시 (`compaction_start/end` 이벤트 이미 수신 가능)
- [ ] 인증 레이어 (Basic auth 또는 토큰) — 현재 **LAN 전용으로만 쓸 것**
      (에이전트가 서버 파일시스템 접근 가능하므로 외부 노출 금지)
- [ ] 다중 프로젝트: 드로어에서 `PI_WEB_CWD` 전환 (`runtime.switchSession`의 `cwdOverride` 활용)

## 5. 알려진 이슈 / 엣지케이스

- **스트리밍 도중 새 클라이언트 접속**: 진행 중인 assistant 메시지의 이미 전송된 델타는
  못 받음 → 다음 스냅샷까지 해당 메시지가 비어 보일 수 있음 (message_end에 해소)
- **fork-points 순서 가정**: fork 메뉴는 entryId 기반이라 안전하지만, 메시지별 인라인
  fork 버튼을 만들려면 스냅샷 메시지에 entryId를 실어야 함 (현재 미구현)
- **grok 등 일부 모델은 thinking "off" 불가**: `thinkingLevelMap.off === null`이라
  UI에 off가 안 뜨는 게 정상 동작
- **iOS Safari**: `h-dvh` + safe-area 대응했으나 실기기 키보드 올라올 때 레이아웃은 미검증

## 6. 참고 자료

- pi SDK 문서: `/Users/ms/.local/share/mise/installs/node/24.10.0/lib/node_modules/@earendil-works/pi-coding-agent/docs/sdk.md`
- SDK 예제: 같은 경로의 `examples/sdk/` (01-minimal ~ 13-session-runtime)
- 타입 확인은 설치된 패키지의 `dist/**/*.d.ts` 직접 grep이 가장 정확했음
  (특히 `core/agent-session.d.ts`, `core/agent-session-runtime.d.ts`)
