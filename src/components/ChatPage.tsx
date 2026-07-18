import { useChat } from "../lib/chat";
import { useSidebarPinned } from "../lib/sidebar";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ModelMenu } from "./ModelMenu";
import { SessionsDrawer, SessionsSidebar } from "./SessionsDrawer";
import { SettingsMenu } from "./SettingsMenu";
import { ThinkingMenu } from "./ThinkingMenu";

export function ChatPage() {
  const { connected, snapshot, streamText, streamThinking, activeTools } = useChat();
  const isStreaming = snapshot?.isStreaming ?? false;
  const sidebarPinned = useSidebarPinned();

  return (
    <div className="flex h-dvh">
      {sidebarPinned && <SessionsSidebar currentSessionFile={snapshot?.sessionFile} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] dark:border-neutral-800">
          <SessionsDrawer currentSessionFile={snapshot?.sessionFile} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">π</span>
            <span
              className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
              title={connected ? "연결됨" : "연결 끊김"}
            />
          </div>
          <div className="flex-1" />
          <ThinkingMenu
            current={snapshot?.thinkingLevel ?? "off"}
            levels={snapshot?.thinkingLevels ?? ["off"]}
          />
          <ModelMenu current={snapshot?.model ?? null} />
          <SettingsMenu />
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
    </div>
  );
}
