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
  | { type: "image"; dataUrl?: string };

export interface UIMessage {
  role: "user" | "assistant" | "custom";
  content: UIContentBlock[];
  errorMessage?: string;
}

export interface UIModel {
  provider: string;
  id: string;
  name?: string;
  reasoning?: boolean;
}

export type UIThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface UISnapshot {
  messages: UIMessage[];
  isStreaming: boolean;
  model: UIModel | null;
  thinkingLevel: UIThinkingLevel;
  /** 현재 모델이 지원하는 thinking level 목록 */
  thinkingLevels: UIThinkingLevel[];
  sessionFile?: string;
}

export interface UISessionInfo {
  path: string;
  name?: string;
  firstMessage: string;
  modified: string;
  messageCount: number;
}

export interface UIForkPoint {
  entryId: string;
  text: string;
}

export interface UIImageAttachment {
  /** base64 (data URL 아님) */
  data: string;
  mimeType: string;
}

export type ServerEvent =
  | { type: "snapshot"; snapshot: UISnapshot }
  | { type: "delta"; kind: "text" | "thinking"; delta: string }
  | { type: "tool_start"; toolCallId: string; toolName: string }
  | { type: "tool_end"; toolCallId: string; toolName: string; isError: boolean }
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "forked"; selectedText?: string }
  | { type: "error"; message: string };

export type ClientCommand =
  | { type: "prompt"; text: string; images?: UIImageAttachment[] }
  | { type: "abort" }
  | { type: "new_session" }
  | { type: "switch_session"; path: string }
  | { type: "set_model"; provider: string; id: string }
  | { type: "set_thinking_level"; level: UIThinkingLevel }
  | { type: "fork"; entryId: string };
