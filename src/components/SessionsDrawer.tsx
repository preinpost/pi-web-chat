import { Dialog } from "@base-ui-components/react/dialog";
import { useState } from "react";
import { useSessions } from "../lib/api";
import { chatClient } from "../lib/chat";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function SessionsDrawer({ currentSessionFile }: { currentSessionFile?: string }) {
  const [open, setOpen] = useState(false);
  const { data: sessions, refetch } = useSessions(open);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refetch();
      }}
    >
      <Dialog.Trigger
        className="flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
        aria-label="세션 목록"
      >
        <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-white shadow-2xl outline-none transition-transform data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] dark:border-neutral-800">
            <Dialog.Title className="text-sm font-semibold">세션</Dialog.Title>
            <button
              onClick={() => {
                chatClient.send({ type: "new_session" });
                setOpen(false);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white active:bg-indigo-500"
            >
              + 새 세션
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {(sessions ?? []).map((s) => {
              const active = s.path === currentSessionFile;
              return (
                <button
                  key={s.path}
                  onClick={() => {
                    chatClient.send({ type: "switch_session", path: s.path });
                    setOpen(false);
                  }}
                  className={`block w-full border-b border-neutral-200/60 px-4 py-3 text-left hover:bg-neutral-100 dark:border-neutral-800/60 dark:hover:bg-neutral-800/50 ${
                    active ? "bg-neutral-100 dark:bg-neutral-800/70" : ""
                  }`}
                >
                  <div className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                    {s.name ?? s.firstMessage ?? "(빈 세션)"}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {formatDate(s.modified)} · 메시지 {s.messageCount}
                  </div>
                </button>
              );
            })}
            {sessions && sessions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-neutral-500">저장된 세션 없음</div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
