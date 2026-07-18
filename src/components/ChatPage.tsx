import { useChat } from "../lib/chat";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ModelMenu } from "./ModelMenu";
import { SessionsDrawer } from "./SessionsDrawer";

export function ChatPage() {
  const { connected, snapshot, streamText, streamThinking, activeTools } = useChat();
  const isStreaming = snapshot?.isStreaming ?? false;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <SessionsDrawer currentSessionFile={snapshot?.sessionFile} />
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">π</span>
          <span
            className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
            title={connected ? "연결됨" : "연결 끊김"}
          />
        </div>
        <div className="flex-1" />
        <ModelMenu current={snapshot?.model ?? null} />
      </header>

      <MessageList
        messages={snapshot?.messages ?? []}
        streamText={streamText}
        streamThinking={streamThinking}
        activeTools={activeTools}
        isStreaming={isStreaming}
      />

      <Composer isStreaming={isStreaming} />
    </div>
  );
}
