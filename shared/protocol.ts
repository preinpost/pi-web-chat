/** 서버 <-> 클라이언트 공용 프로토콜 타입 */

export type UIContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "toolCall";
      id: string;
      name: string;
      args: unknown;
      /** 페어링된 tool result (있으면) */
      result?: { text: string; isError: boolean };
    }
  | { type: "image" };

export interface UIMessage {
  role: "user" | "assistant" | "custom";
  content: UIContentBlock[];
  errorMessage?: string;
}

export interface UIModel {
  provider: string;
  id: string;
  name?: string;
}

export interface UISnapshot {
  messages: UIMessage[];
  isStreaming: boolean;
  model: UIModel | null;
  sessionFile?: string;
}

export interface UISessionInfo {
  path: string;
  name?: string;
  firstMessage: string;
  modified: string;
  messageCount: number;
}

export type ServerEvent =
  | { type: "snapshot"; snapshot: UISnapshot }
  | { type: "delta"; kind: "text" | "thinking"; delta: string }
  | { type: "tool_start"; toolCallId: string; toolName: string }
  | { type: "tool_end"; toolCallId: string; toolName: string; isError: boolean }
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "error"; message: string };

export type ClientCommand =
  | { type: "prompt"; text: string }
  | { type: "abort" }
  | { type: "new_session" }
  | { type: "switch_session"; path: string }
  | { type: "set_model"; provider: string; id: string };
