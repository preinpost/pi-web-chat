import { useChat } from "../lib/chat";
import { useT } from "../lib/i18n";
import { useSidebarPinned } from "../lib/sidebar";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ModelMenu } from "./ModelMenu";
import { SessionsDrawer, SessionsSidebar } from "./SessionsDrawer";
import { SettingsMenu } from "./SettingsMenu";
import { ThinkingMenu } from "./ThinkingMenu";

function connectionDotClass(connection: "connecting" | "connected" | "disconnected"): string {
  switch (connection) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-400 animate-pulse";
    case "disconnected":
      return "bg-red-500";
  }
}

function connectionLabel(
  connection: "connecting" | "connected" | "disconnected",
  t: ReturnType<typeof useT>,
): string {
  switch (connection) {
    case "connected":
      return t("connected");
    case "connecting":
      return t("connecting");
    case "disconnected":
      return t("disconnected");
  }
}

export function ChatPage() {
  const t = useT();
  const { connection, snapshot, streamText, streamThinking, activeTools } = useChat();
  const isStreaming = snapshot?.isStreaming ?? false;
  const sidebarPinned = useSidebarPinned();
  const showConnectingOverlay = connection !== "connected" && !snapshot;

  // absolute inset-0 → #root (position:fixed). Avoids short column + fake bottom gap
  // when router/query wrappers don't pass height down.
  return (
    <div className="absolute inset-0 flex min-h-0 w-full">
      {sidebarPinned && <SessionsSidebar currentSessionFile={snapshot?.sessionFile} />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-1.5 border-b border-neutral-200 px-3 py-2 pt-[max(0.5rem,var(--safe-top))] dark:border-neutral-800">
          <SessionsDrawer currentSessionFile={snapshot?.sessionFile} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">π</span>
            <span
              className={`size-2 rounded-full ${connectionDotClass(connection)}`}
              title={connectionLabel(connection, t)}
              aria-label={connectionLabel(connection, t)}
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

        {showConnectingOverlay ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span
              className={`size-2.5 rounded-full ${connectionDotClass(connection)}`}
              aria-hidden
            />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {connection === "disconnected" ? t("connectionLost") : t("connectingHint")}
            </p>
          </div>
        ) : (
          <>
            <MessageList
              messages={snapshot?.messages ?? []}
              streamText={streamText}
              streamThinking={streamThinking}
              activeTools={activeTools}
              isStreaming={isStreaming}
            />
            <Composer isStreaming={isStreaming} />
          </>
        )}
      </div>
    </div>
  );
}
