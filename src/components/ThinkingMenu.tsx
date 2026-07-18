import { Menu } from "@base-ui-components/react/menu";
import type { UIThinkingLevel } from "../../shared/protocol";
import { chatClient } from "../lib/chat";

export function ThinkingMenu({
  current,
  levels,
}: {
  current: UIThinkingLevel;
  levels: UIThinkingLevel[];
}) {
  // 모델이 thinking 미지원이면 숨김
  if (levels.length <= 1) return null;

  return (
    <Menu.Root>
      <Menu.Trigger
        className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600"
        title="Thinking level"
      >
        <span className="mr-1">🧠</span>
        {current}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="w-36 rounded-xl border border-neutral-200 bg-white py-1 shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
            {levels.map((level) => (
              <Menu.Item
                key={level}
                onClick={() => chatClient.send({ type: "set_thinking_level", level })}
                className={`cursor-pointer px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800 ${
                  level === current
                    ? "font-medium text-indigo-600 dark:text-indigo-400"
                    : "text-neutral-700 dark:text-neutral-200"
                }`}
              >
                {level}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
