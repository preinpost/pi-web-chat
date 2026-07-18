import { Dialog } from "@base-ui-components/react/dialog";
import type { UIExtensionInfo } from "../../shared/protocol";
import { useExtensions } from "../lib/api";

const SCOPE_LABEL: Record<UIExtensionInfo["scope"], string> = {
  user: "사용자",
  project: "프로젝트",
  temporary: "임시",
};

function DetailRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1 flex items-baseline gap-1.5 text-[11px] leading-relaxed">
      <span className="shrink-0 text-neutral-400 dark:text-neutral-500">{label}</span>
      <span className="font-mono break-all text-neutral-500 dark:text-neutral-400">
        {items.join(", ")}
      </span>
    </div>
  );
}

/** 현재 세션에 로드된 확장 목록 */
export function ExtensionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, refetch } = useExtensions(open);
  const extensions = data?.extensions ?? [];
  const errors = data?.errors ?? [];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) void refetch();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex max-h-[75vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <Dialog.Title className="text-sm font-semibold">활성 확장</Dialog.Title>
            <Dialog.Description className="mt-0.5 text-xs text-neutral-500">
              {data
                ? `${extensions.length}개의 확장이 현재 세션에 로드되어 있습니다.`
                : "현재 세션에 로드된 확장을 불러오는 중…"}
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-y-auto">
            {errors.length > 0 && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40">
                <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                  로드 실패 {errors.length}건
                </div>
                {errors.map((e) => (
                  <div key={e.path} className="mt-1.5 text-[11px]">
                    <div className="font-mono break-all text-red-500 dark:text-red-400">
                      {e.path}
                    </div>
                    <div className="text-red-500/80 dark:text-red-400/80">{e.error}</div>
                  </div>
                ))}
              </div>
            )}

            {extensions.map((ext) => (
              <div
                key={ext.path}
                className="border-b border-neutral-100 px-4 py-3 last:border-0 dark:border-neutral-800/60"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {ext.name}
                  </span>
                  {ext.packageName && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {ext.packageName}
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      ext.scope === "project"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : ext.scope === "temporary"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                    }`}
                  >
                    {SCOPE_LABEL[ext.scope]}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                  {ext.path}
                </div>
                <DetailRow label="도구" items={ext.tools} />
                <DetailRow label="커맨드" items={ext.commands} />
                <DetailRow label="플래그" items={ext.flags} />
                <DetailRow label="이벤트" items={ext.events} />
              </div>
            ))}

            {data && extensions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-neutral-500">
                로드된 확장이 없습니다
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
