import { useEffect, useRef, useState } from "react";
import type { UIImageAttachment } from "../../shared/protocol";
import { chatClient, useChat } from "../lib/chat";
import { useT } from "../lib/i18n";

interface PendingImage extends UIImageAttachment {
  previewUrl: string;
}

async function fileToImage(file: File): Promise<PendingImage | null> {
  if (!file.type.startsWith("image/")) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { data: base64, mimeType: file.type, previewUrl: dataUrl };
}

export function Composer({ isStreaming }: { isStreaming: boolean }) {
  const t = useT();
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { injectText, focusToken } = useChat();

  // fork 후 선택된 메시지 텍스트를 composer에 주입
  useEffect(() => {
    if (injectText !== null) {
      setText(injectText);
      chatClient.consumeInjectText();
      textareaRef.current?.focus();
    }
  }, [injectText]);

  // 새 세션 등에서 입력창 포커스 요청
  useEffect(() => {
    if (focusToken > 0) textareaRef.current?.focus();
  }, [focusToken]);

  const addFiles = async (files: Iterable<File>) => {
    const loaded = await Promise.all([...files].map(fileToImage));
    setImages((prev) => [...prev, ...loaded.filter((i): i is PendingImage => i !== null)]);
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    chatClient.send({
      type: "prompt",
      text: trimmed,
      images: images.length > 0 ? images.map(({ data, mimeType }) => ({ data, mimeType })) : undefined,
    });
    setText("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl">
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img.previewUrl}
                  alt=""
                  className="size-16 rounded-lg border border-neutral-200 object-cover dark:border-neutral-700"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-700 text-xs text-white"
                  aria-label={t("removeImage")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
            aria-label={t("attachImage")}
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
              <path
                d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21M19 22v-6M16 19h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            placeholder={isStreaming ? t("streamingPlaceholder") : t("sendMessage")}
            className="composer-textarea max-h-40 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onPaste={(e) => {
              const files = [...e.clipboardData.items]
                .filter((item) => item.kind === "file")
                .map((item) => item.getAsFile())
                .filter((f): f is File => f !== null);
              if (files.length > 0) {
                e.preventDefault();
                void addFiles(files);
              }
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
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-700 active:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:active:bg-neutral-700"
              aria-label={t("abort")}
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-current">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!text.trim() && images.length === 0}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-opacity disabled:opacity-30 active:bg-indigo-500"
              aria-label={t("send")}
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
