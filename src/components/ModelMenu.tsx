import { Menu } from "@base-ui-components/react/menu";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UIModel } from "../../shared/protocol";
import { useModels } from "../lib/api";
import { chatClient } from "../lib/chat";

function matchesQuery(model: UIModel, q: string) {
  if (!q) return true;
  const hay = `${model.name ?? ""} ${model.id} ${model.provider}`.toLowerCase();
  return hay.includes(q);
}

export function ModelMenu({ current }: { current: UIModel | null }) {
  const { data: models } = useModels();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (models ?? []).filter((m) => matchesQuery(m, q));
  }, [models, query]);

  // Menu 내부 focus manager가 먼저 잡은 뒤 검색창으로 재포커스
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const focus = () => inputRef.current?.focus();
    const t1 = window.setTimeout(focus, 0);
    const t2 = window.setTimeout(focus, 50);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open]);

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger className="max-w-[40vw] truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600">
        {current ? (current.name ?? current.id) : "모델 선택"}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="flex w-72 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
              <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 dark:bg-neutral-800">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 fill-none stroke-neutral-400 stroke-2"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3-3" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="모델 검색…"
                  aria-label="모델 검색"
                  autoFocus
                  className="w-full bg-transparent py-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  // 메뉴 typeahead / 화살표 네비와 충돌 방지
                  onKeyDown={(e) => {
                    if (e.key === "Escape") return;
                    // 아래 화살표는 목록으로 넘김
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      e.currentTarget.blur();
                      return;
                    }
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    aria-label="검색어 지우기"
                  >
                    <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-2">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[min(50vh,22rem)] overflow-y-auto py-1">
              {filtered.map((m) => {
                const active = current && m.provider === current.provider && m.id === current.id;
                return (
                  <Menu.Item
                    key={`${m.provider}/${m.id}`}
                    onClick={() =>
                      chatClient.send({ type: "set_model", provider: m.provider, id: m.id })
                    }
                    className={`flex cursor-pointer flex-col px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800 ${
                      active
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-neutral-700 dark:text-neutral-200"
                    }`}
                  >
                    <span className="truncate">{m.name ?? m.id}</span>
                    <span className="text-xs text-neutral-500">{m.provider}</span>
                  </Menu.Item>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-neutral-500">
                  {models && models.length === 0 ? "사용 가능한 모델 없음" : "검색 결과 없음"}
                </div>
              )}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
