import { Menu } from "@base-ui-components/react/menu";
import { useState } from "react";
import {
  setThemePreference,
  useThemePreference,
  type ThemePreference,
} from "../lib/theme";
import { ExtensionsDialog } from "./ExtensionsDialog";
import { ForkDialog } from "./ForkDialog";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

const itemClass =
  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-700 outline-none data-[highlighted]:bg-neutral-100 dark:text-neutral-200 dark:data-[highlighted]:bg-neutral-800";

export function SettingsMenu() {
  const preference = useThemePreference();
  const [forkOpen, setForkOpen] = useState(false);
  const [extensionsOpen, setExtensionsOpen] = useState(false);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className="flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
          aria-label="설정"
          title="설정"
        >
          <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1.1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="end">
            <Menu.Popup className="w-52 rounded-xl border border-neutral-200 bg-white py-1 shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
              <Menu.Group>
                <Menu.GroupLabel className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
                  테마
                </Menu.GroupLabel>
                <Menu.RadioGroup
                  value={preference}
                  onValueChange={(value) => {
                    if (value === "system" || value === "light" || value === "dark") {
                      setThemePreference(value);
                    }
                  }}
                >
                  {THEME_OPTIONS.map((opt) => (
                    <Menu.RadioItem
                      key={opt.value}
                      value={opt.value}
                      closeOnClick
                      className={itemClass}
                    >
                      <span className="flex size-3.5 items-center justify-center rounded-full border border-neutral-400 dark:border-neutral-500">
                        <Menu.RadioItemIndicator className="size-1.5 rounded-full bg-indigo-500" />
                      </span>
                      <span
                        className={
                          preference === opt.value
                            ? "font-medium text-indigo-600 dark:text-indigo-400"
                            : undefined
                        }
                      >
                        {opt.label}
                      </span>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </Menu.Group>

              <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />

              <Menu.Item className={itemClass} onClick={() => setForkOpen(true)}>
                <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
                  <circle cx="6" cy="5" r="2" />
                  <circle cx="18" cy="5" r="2" />
                  <circle cx="12" cy="19" r="2" />
                  <path
                    d="M6 7v1.3a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V7M12 12.3v4.5"
                    strokeLinecap="round"
                  />
                </svg>
                세션 포크…
              </Menu.Item>

              <Menu.Item className={itemClass} onClick={() => setExtensionsOpen(true)}>
                <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
                  <path
                    d="M20 7h-3a2 2 0 1 0-4 0H4a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h3a2 2 0 1 1 4 0h9a2 2 0 0 0 2-2v-3a2 2 0 1 0 0-4V9a2 2 0 0 0-2-2Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                활성 확장…
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <ForkDialog open={forkOpen} onOpenChange={setForkOpen} />
      <ExtensionsDialog open={extensionsOpen} onOpenChange={setExtensionsOpen} />
    </>
  );
}
