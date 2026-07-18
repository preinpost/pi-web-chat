# pi-web-chat

pi 코딩 에이전트용 웹 UI (OpenWebUI 스타일). 모바일 지원.

[English](./README.md)

## Install & run

의도한 사용 흐름:

```bash
# 1) pi 설치 (이미 있으면 skip)
npm i -g @earendil-works/pi-coding-agent

# 2) pi-web-chat 패키지 설치
pi install npm:pi-web-chat
# pi install /path/to/pi-web-chat          # 로컬
# pi install git:github.com/preinpost/pi-web-chat@v0.1.1

# 3) 웹 UI만 백그라운드 기동 (TUI 안 뜸, 바로 셸 복귀)
pi --web
# → pi-web-chat started — http://localhost:3141

pi --web status
pi --web stop
pi --web 3200          # 포트 지정
```

`pi --web`은 **웹 서버 데몬만** 띄우고 즉시 종료합니다. pi TUI는 열리지 않습니다.
이미 떠 있으면 URL만 다시 보여 줍니다.

### 다른 실행 방법

```bash
# 단독 CLI (pi 세션 없이)
pi-web-chat

# pi 세션 안 slash command
/web           # start (default port 3141)
/web 3200      # port 지정
/web status
/web stop
```

상태 파일: `~/.pi/web-chat/pi-web-chat.pid`, `pi-web-chat.port`, `pi-web-chat.log`

> `pi install`은 production deps만 설치합니다. 프론트는 `dist/public` 빌드 산출물로 포함되므로 사용자 PC에 Vite/React가 필요 없습니다.

## 개발

```bash
npm install

# 개발 (서버:3141 + vite:5173, /api·/ws 프록시)
npm run dev
# → http://localhost:5173

# 프로덕션 빌드 + 실행
npm run build
npm start
# → http://localhost:3141
```

### 패키지 배포 체크

```bash
npm run pack:check   # build + npm pack --dry-run
npm pack             # pi-web-chat-*.tgz 생성
pi install ./pi-web-chat-0.1.1.tgz
# 또는 디렉터리 직접
pi install .
```

### GitHub Actions 릴리스

repo **Actions → Release → Run workflow** 에서 bump 타입을 고릅니다.

| input | 설명 |
|---|---|
| `bump` | `patch` / `minor` / `major` |
| `publish_npm` | 태그 후 npm publish (기본 on) |
| `dry_run` | git push 생략 + `npm publish --dry-run` (실제 배포 안 함) |

흐름: `npm ci` → `typecheck` → `build` → `npm pack --dry-run` → `npm version <bump>` → push commit/tag → `npm publish`

필요 secret:
- `NPM_TOKEN` — npm automation/publish 토큰 (`publish_npm` 사용 시)

로컬에서 pi package 로드만 빠르게 보려면:

```bash
npm run build
pi -e .
# 세션에서 /web
```

## 환경변수

- `PORT`: 서버 포트 (기본 3141)
- `HOST`: bind 주소 (기본 `127.0.0.1`). LAN 공개 시에만 `0.0.0.0` 등 사용
- `PI_WEB_CWD`: 에이전트 작업/세션 디렉토리 (기본: `~/.pi/web-chat`, 없으면 자동 생성)

인증은 pi CLI와 동일하게 `~/.pi/agent/auth.json`을 사용합니다. 먼저 `pi`를 한 번 실행해 로그인/API 키 설정이 되어 있어야 합니다.

> **보안**: 앱 자체 인증이 없습니다. 기본은 루프백 전용입니다. 외부/공인망에 그대로 노출하지 마세요. 원격 접근이 필요하면 Tailscale serve / SSH 터널 등을 권장합니다.

## 스택

- **서버**: Node + [pi SDK](https://pi.dev) (`@earendil-works/pi-coding-agent`) + WebSocket (`ws`)
- **프론트**: React 19 + TanStack Router / Query + Base UI + Tailwind CSS v4 + Vite

## 구조

```
bin/pi-web-chat.mjs       CLI 엔트리 (dist/index.js 실행)
extensions/pi-web-chat.ts pi package extension (/web)
scripts/build.mjs         vite 프론트 + esbuild 서버 번들
server/                   서버 소스
shared/protocol.ts        서버/클라 공용 타입
src/                      프론트 소스
dist/index.js             빌드된 서버 (배포물)
dist/public/              빌드된 프론트 (배포물)
```

## 기능

- 실시간 스트리밍 (text / thinking 델타)
- **마크다운 렌더링** (react-markdown + GFM + highlight.js 코드 하이라이팅)
- 툴 실행 표시 (bash, edit, read, ...) + 결과 펼쳐보기
- 세션 목록 / 전환 / 새 세션 (pi CLI 세션과 공유됨)
- **세션 포크**: 설정 메뉴에서 특정 유저 메시지 지점으로 새 세션 분기
- 모델 전환 + **thinking level 전환**
- **이미지 첨부**: 파일 선택 / 클립보드 붙여넣기
- **설정 메뉴**: 테마(시스템/라이트/다크) + 세션 포크
- 스트리밍 중 메시지 전송 → steering
- 중단 (abort)
- 모바일: safe-area, dvh 레이아웃, 세션 드로어
