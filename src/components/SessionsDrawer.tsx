import { Dialog } from "@base-ui-components/react/dialog";
import { useEffect, useRef, useState } from "react";
import type { UISessionInfo } from "../../shared/protocol";
import { useInvalidateSessions, useSessions } from "../lib/api";
import { chatClient, useChat } from "../lib/chat";
import { onRequestOpenSessionsDrawer } from "../lib/drawer";
import { localeTag, useLocale, useT } from "../lib/i18n";
import { setSidebarPinned, useSidebarPinned } from "../lib/sidebar";

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(locale, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  );
}

/** 사이드바 패널 고정 아이콘 */
function SidebarPinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
      {filled ? (
        <path
          d="M16 3H8v2l1.5 1.5L8 12h3v7l1 2 1-2v-7h3l-1.5-5.5L16 5V3z"
          className="fill-current"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 3H8v2l1.5 1.5L8 12h3v7l1 2 1-2v-7h3l-1.5-5.5L16 5V3z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
}: {
  session: UISessionInfo;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <button
      onClick={onSelect}
      className={`w-full border-b border-neutral-200/60 px-4 py-3 text-left hover:bg-neutral-100 dark:border-neutral-800/60 dark:hover:bg-neutral-800/50 ${
        active ? "bg-neutral-100 dark:bg-neutral-800/70" : ""
      }`}
    >
      <div className="truncate text-sm text-neutral-800 dark:text-neutral-200">
        {session.name ?? session.firstMessage ?? t("emptySession")}
      </div>
      <div className="mt-0.5 text-xs text-neutral-500">
        {formatDate(session.modified, localeTag(locale))} ·{" "}
        {t("messageCount", { count: session.messageCount })}
      </div>
    </button>
  );
}

/** sessionFile 변경·스트리밍 종료 시 목록 갱신 */
function useSessionListSync(enabled: boolean) {
  const invalidate = useInvalidateSessions();
  const { snapshot } = useChat();
  const sessionFile = snapshot?.sessionFile;
  const isStreaming = snapshot?.isStreaming ?? false;
  const prevStreaming = useRef(isStreaming);

  // 세션 파일 바뀜 (new/switch/fork)
  useEffect(() => {
    if (!enabled || !sessionFile) return;
    void invalidate();
  }, [enabled, sessionFile, invalidate]);

  // 응답 끝나면 firstMessage/messageCount 반영
  useEffect(() => {
    if (!enabled) {
      prevStreaming.current = isStreaming;
      return;
    }
    if (prevStreaming.current && !isStreaming) {
      void invalidate();
    }
    prevStreaming.current = isStreaming;
  }, [enabled, isStreaming, invalidate]);
}

function SessionsPanel({
  currentSessionFile,
  docked,
  active = true,
  onSelectSession,
  onClose,
  onDock,
}: {
  currentSessionFile?: string;
  docked?: boolean;
  /** false면 fetch 중지 (닫힌 드로어) */
  active?: boolean;
  onSelectSession?: () => void;
  onClose?: () => void;
  /** 드로어 → 고정 전환 (닫힘 애니메이션 없이) */
  onDock?: () => void;
}) {
  const t = useT();
  const sidebarPinned = useSidebarPinned();
  const { data: sessions, refetch } = useSessions(active);
  useSessionListSync(active);

  // 패널이 활성화될 때마다 최신화 (드로어 오픈 / 독 마운트)
  useEffect(() => {
    if (active) void refetch();
  }, [active, refetch]);

  const toggleDock = () => {
    if (sidebarPinned) {
      setSidebarPinned(false);
      return;
    }
    // 드로어에서 고정: 부모에서 애니메이션 없이 전환
    if (onDock) onDock();
    else setSidebarPinned(true);
  };

  return (
    <>
      <div
        className={`flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 ${
          docked ? "pt-3" : "pt-[calc(0.75rem+env(safe-area-inset-top))]"
        }`}
      >
        <div className="flex items-center gap-2">
          {docked ? (
            <h2 className="text-sm font-semibold">{t("sessions")}</h2>
          ) : (
            <Dialog.Title className="text-sm font-semibold">{t("sessions")}</Dialog.Title>
          )}
          {/* 데스크톱에서만 사이드바 고정 토글 */}
          <button
            type="button"
            onClick={toggleDock}
            title={sidebarPinned ? t("unpinSidebar") : t("pinSidebar")}
            aria-label={sidebarPinned ? t("unpinSidebar") : t("pinSidebar")}
            aria-pressed={sidebarPinned}
            className={`hidden size-8 items-center justify-center rounded-lg transition-colors md:flex ${
              sidebarPinned
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <SidebarPinIcon filled={sidebarPinned} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              chatClient.send({ type: "new_session" });
              // sessionFile 변경 이벤트로 invalidate 되지만, 빈 세션이
              // 목록에 바로 안 잡힐 수 있어 한 번 더 갱신
              window.setTimeout(() => void refetch(), 150);
              onClose?.();
              chatClient.requestComposerFocus();
            }}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white active:bg-indigo-500"
          >
            {t("newSession")}
          </button>
          {docked && (
            <button
              type="button"
              onClick={() => setSidebarPinned(false)}
              className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label={t("closeSidebar")}
              title={t("closeSidebar")}
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {(sessions ?? []).map((s) => (
          <SessionRow
            key={s.path}
            session={s}
            active={s.path === currentSessionFile}
            onSelect={() => {
              chatClient.send({ type: "switch_session", path: s.path });
              onSelectSession?.();
            }}
          />
        ))}
        {sessions && sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">{t("noSavedSessions")}</div>
        )}
      </div>
    </>
  );
}

/** 데스크톱 고정 사이드바 */
export function SessionsSidebar({ currentSessionFile }: { currentSessionFile?: string }) {
  return (
    <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      <SessionsPanel currentSessionFile={currentSessionFile} docked active />
    </aside>
  );
}

/** 오버레이 드로어 (모바일 / 고정 해제 상태) */
export function SessionsDrawer({ currentSessionFile }: { currentSessionFile?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  /** 핀 고정 전환 시 true → Portal을 즉시 제거해 닫힘 애니 스킵 */
  const [instantHide, setInstantHide] = useState(false);
  const sidebarPinned = useSidebarPinned();

  const dockFromDrawer = () => {
    setInstantHide(true);
    setSidebarPinned(true);
    setOpen(false);
  };

  // 엣지 스와이프 등 외부 요청으로 드로어 열기
  useEffect(() => {
    return onRequestOpenSessionsDrawer(() => {
      if (sidebarPinned) return; // 고정 사이드바 상태면 무시
      setInstantHide(false);
      setOpen(true);
    });
  }, [sidebarPinned]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setInstantHide(false);
        setOpen(next);
      }}
    >
      <Dialog.Trigger
        className={`flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-200 ${
          sidebarPinned ? "md:hidden" : ""
        }`}
        aria-label={t("sessionList")}
      >
        <MenuIcon />
      </Dialog.Trigger>
      {!instantHide && (
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/60 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
          <Dialog.Popup className="fixed inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-white shadow-2xl outline-none transition-transform data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full dark:bg-neutral-900">
            <SessionsPanel
              currentSessionFile={currentSessionFile}
              active={open}
              onSelectSession={() => setOpen(false)}
              onClose={() => setOpen(false)}
              onDock={dockFromDrawer}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
