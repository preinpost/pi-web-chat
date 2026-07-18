import { useRef, useState } from "react";
import { chatClient } from "../lib/chat";

export function Composer({ isStreaming }: { isStreaming: boolean }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    chatClient.send({ type: "prompt", text: trimmed });
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder={isStreaming ? "스트리밍 중… (보내면 steering 됩니다)" : "메시지 보내기"}
          className="max-h-40 flex-1 resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-[15px] outline-none placeholder:text-neutral-600 focus:border-neutral-600"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            // 데스크탑: Enter로 전송, 모바일(터치)은 버튼 사용
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              const isTouch = window.matchMedia("(pointer: coarse)").matches;
              if (!isTouch) {
                e.preventDefault();
                send();
              }
            }
          }}
        />
        {isStreaming ? (
          <button
            onClick={() => chatClient.send({ type: "abort" })}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 active:bg-neutral-700"
            aria-label="중단"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!text.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-opacity disabled:opacity-30 active:bg-indigo-500"
            aria-label="전송"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
