import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  getAgentDir,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  ClientCommand,
  ServerEvent,
  UISessionInfo,
  UISnapshot,
  UIThinkingLevel,
} from "../shared/protocol.ts";
import { serializeMessages } from "./serialize.ts";

const PORT = Number(process.env.PORT ?? 3141);
// 에이전트가 작업할 디렉토리 (기본: pi-web 실행 위치, PI_WEB_CWD로 변경 가능)
const AGENT_CWD = resolve(process.env.PI_WEB_CWD ?? process.cwd());
const DIST_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "dist");

// ---------------------------------------------------------------------------
// pi 세션 런타임
// ---------------------------------------------------------------------------

const modelRuntime = await ModelRuntime.create();

const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd, sessionManager, sessionStartEvent }) => {
  const services = await createAgentSessionServices({ cwd });
  return {
    ...(await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent })),
    services,
    diagnostics: services.diagnostics,
  };
};

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: AGENT_CWD,
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(AGENT_CWD),
});

// ---------------------------------------------------------------------------
// WebSocket 브로드캐스트
// ---------------------------------------------------------------------------

const clients = new Set<WebSocket>();

function broadcast(event: ServerEvent) {
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

const ALL_THINKING_LEVELS: UIThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

function supportedThinkingLevels(model: unknown): UIThinkingLevel[] {
  const m = model as
    | { reasoning?: boolean; thinkingLevelMap?: Record<string, string | null> }
    | null
    | undefined;
  if (!m?.reasoning) return ["off"];
  const map = m.thinkingLevelMap;
  return ALL_THINKING_LEVELS.filter((level) => {
    if (map && map[level] === null) return false;
    // xhigh/max는 명시적으로 매핑된 모델 패밀리만 지원
    if ((level === "xhigh" || level === "max") && map?.[level] == null) return false;
    return true;
  });
}

function buildSnapshot(): UISnapshot {
  const session = runtime.session;
  const model = session.model;
  return {
    messages: serializeMessages(session.messages),
    isStreaming: session.isStreaming,
    model: model
      ? {
          provider: model.provider,
          id: model.id,
          name: (model as { name?: string }).name,
          reasoning: (model as { reasoning?: boolean }).reasoning,
        }
      : null,
    thinkingLevel: session.thinkingLevel as UIThinkingLevel,
    thinkingLevels: supportedThinkingLevels(model),
    sessionFile: session.sessionFile,
  };
}

function broadcastSnapshot() {
  broadcast({ type: "snapshot", snapshot: buildSnapshot() });
}

// 세션 이벤트 구독 (세션 교체 시 재구독 필요)
let unsubscribe: (() => void) | undefined;

function bindSession() {
  unsubscribe?.();
  unsubscribe = runtime.session.subscribe((event) => {
    switch (event.type) {
      case "message_update": {
        const e = event.assistantMessageEvent;
        if (e.type === "text_delta") {
          broadcast({ type: "delta", kind: "text", delta: e.delta });
        } else if (e.type === "thinking_delta") {
          broadcast({ type: "delta", kind: "thinking", delta: e.delta });
        }
        break;
      }
      case "message_end":
        broadcastSnapshot();
        break;
      case "tool_execution_start":
        broadcast({ type: "tool_start", toolCallId: event.toolCallId, toolName: event.toolName });
        break;
      case "tool_execution_end":
        broadcast({
          type: "tool_end",
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          isError: event.isError,
        });
        broadcastSnapshot();
        break;
      case "agent_start":
        broadcast({ type: "agent_start" });
        break;
      case "agent_end":
        broadcast({ type: "agent_end" });
        broadcastSnapshot();
        break;
    }
  });
}

bindSession();

// ---------------------------------------------------------------------------
// 클라이언트 커맨드 처리
// ---------------------------------------------------------------------------

async function handleCommand(cmd: ClientCommand, ws: WebSocket) {
  const session = runtime.session;
  switch (cmd.type) {
    case "prompt": {
      const text = cmd.text.trim();
      const images = (cmd.images ?? []).map((img) => ({
        type: "image" as const,
        data: img.data,
        mimeType: img.mimeType,
      }));
      if (!text && images.length === 0) return;
      // prompt()는 전체 런이 끝날 때까지 resolve되지 않으므로 await하지 않는다
      session
        .prompt(text, {
          images: images.length > 0 ? images : undefined,
          ...(session.isStreaming ? { streamingBehavior: "steer" as const } : {}),
        })
        .catch((err) => {
          sendTo(ws, { type: "error", message: String(err instanceof Error ? err.message : err) });
        });
      break;
    }
    case "abort":
      await session.abort();
      broadcastSnapshot();
      break;
    case "new_session":
      await runtime.newSession();
      bindSession();
      broadcastSnapshot();
      break;
    case "switch_session":
      await runtime.switchSession(cmd.path);
      bindSession();
      broadcastSnapshot();
      break;
    case "set_model": {
      const model = modelRuntime.getModel(cmd.provider, cmd.id);
      if (!model) {
        sendTo(ws, { type: "error", message: `Model not found: ${cmd.provider}/${cmd.id}` });
        return;
      }
      await runtime.session.setModel(model);
      broadcastSnapshot();
      break;
    }
    case "set_thinking_level":
      session.setThinkingLevel(cmd.level);
      broadcastSnapshot();
      break;
    case "fork": {
      const result = await runtime.fork(cmd.entryId);
      if (result.cancelled) return;
      bindSession();
      broadcastSnapshot();
      sendTo(ws, { type: "forked", selectedText: result.selectedText });
      break;
    }
  }
}

function sendTo(ws: WebSocket, event: ServerEvent) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
}

// ---------------------------------------------------------------------------
// HTTP 서버 (API + 정적 파일)
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  try {
    if (url.pathname === "/api/sessions") {
      const sessions = await SessionManager.list(AGENT_CWD);
      const list: UISessionInfo[] = sessions
        .sort((a, b) => b.modified.getTime() - a.modified.getTime())
        .slice(0, 100)
        .map((s) => ({
          path: s.path,
          name: s.name,
          firstMessage: s.firstMessage.slice(0, 200),
          modified: s.modified.toISOString(),
          messageCount: s.messageCount,
        }));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(list));
      return;
    }

    if (url.pathname === "/api/models") {
      const models = await modelRuntime.getAvailable();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify(
          models.map((m) => ({
            provider: m.provider,
            id: m.id,
            name: (m as { name?: string }).name,
            reasoning: (m as { reasoning?: boolean }).reasoning,
          })),
        ),
      );
      return;
    }

    if (url.pathname === "/api/fork-points") {
      const points = runtime.session.getUserMessagesForForking();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify(points.map((p) => ({ entryId: p.entryId, text: p.text.slice(0, 200) }))),
      );
      return;
    }

    if (url.pathname === "/api/state") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildSnapshot()));
      return;
    }

    // 정적 파일 (프로덕션 빌드)
    if (existsSync(DIST_DIR)) {
      let filePath = join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      if (!filePath.startsWith(DIST_DIR) || !existsSync(filePath)) {
        filePath = join(DIST_DIR, "index.html"); // SPA fallback
      }
      const ext = extname(filePath);
      res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" });
      res.end(readFileSync(filePath));
      return;
    }

    res.writeHead(404);
    res.end("Not found. Run `npm run build` first, or use `npm run dev`.");
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }));
  }
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  clients.add(ws);
  sendTo(ws, { type: "snapshot", snapshot: buildSnapshot() });

  ws.on("message", (raw) => {
    let cmd: ClientCommand;
    try {
      cmd = JSON.parse(raw.toString());
    } catch {
      return;
    }
    handleCommand(cmd, ws).catch((err) => {
      sendTo(ws, { type: "error", message: String(err instanceof Error ? err.message : err) });
    });
  });

  ws.on("close", () => clients.delete(ws));
});

httpServer.listen(PORT, () => {
  console.log(`pi-web server: http://localhost:${PORT}  (agent cwd: ${AGENT_CWD})`);
});
