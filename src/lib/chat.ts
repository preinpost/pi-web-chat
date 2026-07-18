import { useSyncExternalStore } from "react";
import type { ClientCommand, ServerEvent, UISnapshot } from "../../shared/protocol";

export interface ActiveTool {
  toolCallId: string;
  toolName: string;
}

/** WS lifecycle for chrome status (avoid red flash on first paint). */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ChatState {
  connection: ConnectionStatus;
  snapshot: UISnapshot | null;
  /** 현재 스트리밍 중인 assistant 텍스트 (아직 snapshot에 없음) */
  streamText: string;
  streamThinking: string;
  activeTools: ActiveTool[];
  /** fork 직후 composer에 주입할 텍스트 (소비 후 clear) */
  injectText: string | null;
  /** 증가할 때마다 composer textarea 포커스 */
  focusToken: number;
}

const initialState: ChatState = {
  connection: "connecting",
  snapshot: null,
  streamText: "",
  streamThinking: "",
  activeTools: [],
  injectText: null,
  focusToken: 0,
};

class ChatClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private reconnectDelay = 400;
  private intentionalClose = false;
  /** After a drop, stay on "connecting" briefly before showing disconnected. */
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private everConnected = false;
  state: ChatState = initialState;

  connect() {
    if (this.ws || this.intentionalClose) return;
    if (this.state.connection === "disconnected") {
      this.update({ connection: "connecting" });
    }

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.clearDisconnectTimer();
      this.reconnectDelay = 400;
      this.everConnected = true;
      this.update({ connection: "connected" });
    };
    ws.onmessage = (e) => {
      try {
        this.handle(JSON.parse(e.data) as ServerEvent);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      this.ws = null;
      if (this.intentionalClose) return;

      // Soft state while retrying — don't flash red on first paint / brief blips.
      if (this.state.connection === "connected") {
        this.update({ connection: "connecting" });
      }
      this.scheduleDisconnected();
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(Math.round(this.reconnectDelay * 1.6), 8_000);
    };
    ws.onerror = () => ws.close();
  }

  send(cmd: ClientCommand) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    }
  }

  private scheduleDisconnected() {
    this.clearDisconnectTimer();
    // First load: wait longer before red. After a live session drop: faster.
    const graceMs = this.everConnected ? 1_200 : 4_000;
    this.disconnectTimer = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) return;
      this.update({ connection: "disconnected" });
    }, graceMs);
  }

  private clearDisconnectTimer() {
    if (this.disconnectTimer !== null) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private handle(event: ServerEvent) {
    switch (event.type) {
      case "snapshot":
        // 완결된 메시지가 snapshot에 반영되므로 스트림 버퍼는 비운다
        this.update({ snapshot: event.snapshot, streamText: "", streamThinking: "" });
        break;
      case "delta":
        if (event.kind === "text") {
          this.update({ streamText: this.state.streamText + event.delta });
        } else {
          this.update({ streamThinking: this.state.streamThinking + event.delta });
        }
        break;
      case "tool_start":
        this.update({
          activeTools: [
            ...this.state.activeTools,
            { toolCallId: event.toolCallId, toolName: event.toolName },
          ],
        });
        break;
      case "tool_end":
        this.update({
          activeTools: this.state.activeTools.filter((t) => t.toolCallId !== event.toolCallId),
        });
        break;
      case "agent_start":
        this.update({
          snapshot: this.state.snapshot ? { ...this.state.snapshot, isStreaming: true } : null,
        });
        break;
      case "agent_end":
        // snapshot 도착 전에도 isStreaming을 즉시 내려 로딩 점이 남지 않게 한다
        this.update({
          activeTools: [],
          streamText: "",
          streamThinking: "",
          snapshot: this.state.snapshot
            ? { ...this.state.snapshot, isStreaming: false }
            : null,
        });
        break;
      case "forked":
        if (event.selectedText) this.update({ injectText: event.selectedText });
        break;
      case "error":
        console.error("[pi-web-chat]", event.message);
        break;
    }
  }

  consumeInjectText() {
    if (this.state.injectText !== null) this.update({ injectText: null });
  }

  /** 드로어 닫힘 등과 겹치지 않도록 약간 늦춰 composer에 포커스 */
  requestComposerFocus() {
    window.setTimeout(() => {
      this.update({ focusToken: this.state.focusToken + 1 });
    }, 50);
  }

  private update(partial: Partial<ChatState>) {
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
}

export const chatClient = new ChatClient();

export function useChat(): ChatState {
  return useSyncExternalStore(chatClient.subscribe, chatClient.getSnapshot);
}
