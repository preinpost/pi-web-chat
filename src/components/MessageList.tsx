import { useEffect, useRef } from "react";
import type { UIContentBlock, UIMessage } from "../../shared/protocol";
import type { ActiveTool } from "../lib/chat";
import { Markdown } from "./Markdown";

function ToolCallCard({ block }: { block: Extract<UIContentBlock, { type: "toolCall" }> }) {
  const args = block.args ? JSON.stringify(block.args) : "";
  return (
    <details className="my-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm dark:border-neutral-800 dark:bg-neutral-900/60">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 select-none">
        <span
          className={`size-2 shrink-0 rounded-full ${
            block.result ? (block.result.isError ? "bg-red-500" : "bg-emerald-500") : "bg-amber-400 animate-pulse"
          }`}
        />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{block.name}</span>
        <span className="truncate font-mono text-xs text-neutral-500">{args.slice(0, 80)}</span>
      </summary>
      <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <pre className="max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap text-neutral-500 dark:text-neutral-400">
          {args}
        </pre>
        {block.result && (
          <pre
            className={`mt-2 max-h-64 overflow-auto border-t border-neutral-200 pt-2 font-mono text-xs whitespace-pre-wrap dark:border-neutral-800 ${
              block.result.isError ? "text-red-500 dark:text-red-400" : "text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {block.result.text.slice(0, 4000) || "(no output)"}
          </pre>
        )}
      </div>
    </details>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <details className="my-1.5 text-sm">
      <summary className="cursor-pointer text-xs text-neutral-500 select-none">thinking…</summary>
      <div className="mt-1 border-l-2 border-neutral-200 pl-3 text-neutral-500 italic whitespace-pre-wrap dark:border-neutral-800">
        {text}
      </div>
    </details>
  );
}

function Blocks({ blocks, markdown }: { blocks: UIContentBlock[]; markdown: boolean }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return markdown ? (
              <Markdown key={i} text={b.text} />
            ) : (
              <div key={i} className="whitespace-pre-wrap leading-relaxed">
                {b.text}
              </div>
            );
          case "thinking":
            return <Thinking key={i} text={b.text} />;
          case "toolCall":
            return <ToolCallCard key={i} block={b} />;
          case "image":
            return b.dataUrl ? (
              <img
                key={i}
                src={b.dataUrl}
                alt="첨부 이미지"
                className="my-1 max-h-64 max-w-full rounded-lg"
              />
            ) : (
              <div key={i} className="text-xs opacity-60">
                [이미지]
              </div>
            );
        }
      })}
    </>
  );
}

function Message({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white sm:max-w-[75%]">
          <Blocks blocks={message.content} markdown={false} />
        </div>
      </div>
    );
  }
  return (
    <div className="text-[15px]">
      <Blocks blocks={message.content} markdown />
      {message.errorMessage && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {message.errorMessage}
        </div>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  streamText,
  streamThinking,
  activeTools,
  isStreaming,
}: {
  messages: UIMessage[];
  streamText: string;
  streamThinking: string;
  activeTools: ActiveTool[];
  isStreaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
    }
  });

  return (
    <div
      ref={containerRef}
      onScroll={() => {
        const el = containerRef.current;
        if (!el) return;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        {messages.length === 0 && !streamText && (
          <div className="mt-24 text-center text-neutral-400 dark:text-neutral-600">
            <div className="text-3xl">π</div>
            <div className="mt-2 text-sm">무엇을 도와드릴까요?</div>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {streamThinking && <Thinking text={streamThinking} />}
        {streamText && (
          <div className="text-[15px]">
            <Markdown text={streamText} />
          </div>
        )}
        {activeTools.map((t) => (
          <div key={t.toolCallId} className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="size-2 animate-pulse rounded-full bg-amber-400" />
            {t.toolName} 실행 중…
          </div>
        ))}
        {isStreaming && !streamText && activeTools.length === 0 && (
          <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
