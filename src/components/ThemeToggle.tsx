import { toggleTheme, useTheme } from "../lib/theme";

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {theme === "dark" ? (
        // 해 아이콘
        <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // 달 아이콘
        <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
