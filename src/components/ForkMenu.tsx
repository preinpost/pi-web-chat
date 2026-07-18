import { Dialog } from "@base-ui-components/react/dialog";
import { useState } from "react";
import { useForkPoints } from "../lib/api";
import { chatClient } from "../lib/chat";

/** 세션의 특정 유저 메시지 지점에서 새 세션으로 fork */
export function ForkMenu() {
  const [open, setOpen] = useState(false);
  const { data: points, refetch } = useForkPoints(open);

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
        aria-label="세션 포크"
        title="이 세션을 특정 지점에서 포크"
      >
        <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
          <circle cx="6" cy="5" r="2.2" />
          <circle cx="18" cy="5" r="2.2" />
          <circle cx="12" cy="19" r="2.2" />
          <path d="M6 7.2v1.3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V7.2M12 12.5v4.3" strokeLinecap="round" />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex max-h-[75vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <Dialog.Title className="text-sm font-semibold">세션 포크</Dialog.Title>
            <Dialog.Description className="mt-0.5 text-xs text-neutral-500">
              선택한 메시지 직전까지의 대화로 새 세션을 만듭니다. 메시지 내용은 입력창에 다시
              채워집니다.
            </Dialog.Description>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {(points ?? []).map((p, i) => (
              <button
                key={p.entryId}
                onClick={() => {
                  chatClient.send({ type: "fork", entryId: p.entryId });
                  setOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="mr-2 font-mono text-xs text-neutral-400">#{i + 1}</span>
                <span className="text-sm text-neutral-700 dark:text-neutral-200">
                  {p.text.slice(0, 100) || "(빈 메시지)"}
                </span>
              </button>
            ))}
            {points && points.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-neutral-500">
                포크할 유저 메시지가 없습니다
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
