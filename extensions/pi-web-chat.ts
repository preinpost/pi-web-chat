/**
 * pi-web-chat extension
 *
 * - `pi --web`  → start UI server daemon and exit (no TUI)
 * - `/web`      → start | stop | status | <port> inside a normal pi session
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = join(ROOT, "dist", "index.js");
const STATE_DIR = join(homedir(), ".pi", "web-chat");
const PID_FILE = join(STATE_DIR, "pi-web-chat.pid");
const PORT_FILE = join(STATE_DIR, "pi-web-chat.port");
const LOG_FILE = join(STATE_DIR, "pi-web-chat.log");
const DEFAULT_PORT = "3141";

type StartResult =
  | { ok: true; port: string; already: boolean; pid: number }
  | { ok: false; error: string };

function readPid(): number | null {
  try {
    if (!existsSync(PID_FILE)) return null;
    const pid = Number(readFileSync(PID_FILE, "utf8").trim());
    if (!Number.isFinite(pid) || pid <= 0) return null;
    process.kill(pid, 0); // throws if not running
    return pid;
  } catch {
    try {
      unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function readPort(): string {
  try {
    if (existsSync(PORT_FILE)) {
      const p = readFileSync(PORT_FILE, "utf8").trim();
      if (p) return p;
    }
  } catch {
    /* ignore */
  }
  return process.env.PORT ?? DEFAULT_PORT;
}

function urlFor(port: string): string {
  return `http://localhost:${port}`;
}

function startServer(port: string): StartResult {
  if (!existsSync(SERVER)) {
    return {
      ok: false,
      error:
        "build missing (dist/index.js). Rebuild the package (`npm run build`) or reinstall pi-web-chat.",
    };
  }

  const existing = readPid();
  if (existing !== null) {
    return { ok: true, port: readPort(), already: true, pid: existing };
  }

  mkdirSync(STATE_DIR, { recursive: true });
  const logFd = openSync(LOG_FILE, "a");

  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: { ...process.env, PORT: port },
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  if (!child.pid) {
    return { ok: false, error: "failed to spawn server process" };
  }

  writeFileSync(PID_FILE, `${child.pid}\n`, "utf8");
  writeFileSync(PORT_FILE, `${port}\n`, "utf8");
  return { ok: true, port, already: false, pid: child.pid };
}

function stopServer(): { stopped: boolean; pid?: number } {
  const pid = readPid();
  if (pid === null) {
    try {
      unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
    try {
      unlinkSync(PORT_FILE);
    } catch {
      /* ignore */
    }
    return { stopped: false };
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* already dead */
  }
  try {
    unlinkSync(PID_FILE);
  } catch {
    /* ignore */
  }
  try {
    unlinkSync(PORT_FILE);
  } catch {
    /* ignore */
  }
  return { stopped: true, pid };
}

function openBrowser(url: string): void {
  try {
    const cmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "cmd"
          : "xdg-open";
    const args =
      process.platform === "win32" ? ["/c", "start", "", url] : [url];
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* optional */
  }
}

type DaemonAction = "start" | "stop" | "status";

/** Parse `pi --web [stop|status|port]` from raw argv (factory-time, before getFlag). */
function parseWebDaemonArgs(argv: string[] = process.argv): {
  enabled: boolean;
  action: DaemonAction;
  port: string;
} {
  const idx = argv.findIndex((arg) => arg === "--web" || arg.startsWith("--web="));
  if (idx === -1) {
    return { enabled: false, action: "start", port: process.env.PORT ?? DEFAULT_PORT };
  }

  const eq = argv[idx]!.startsWith("--web=") ? argv[idx]!.slice("--web=".length) : undefined;
  const next = eq ?? argv[idx + 1];

  if (next === "stop" || next === "status") {
    return { enabled: true, action: next, port: process.env.PORT ?? DEFAULT_PORT };
  }
  if (next && /^\d+$/.test(next)) {
    return { enabled: true, action: "start", port: next };
  }
  return { enabled: true, action: "start", port: process.env.PORT ?? DEFAULT_PORT };
}

function runDaemonAndExit(): void {
  const { action, port } = parseWebDaemonArgs();

  if (action === "stop") {
    const { stopped, pid } = stopServer();
    console.log(stopped ? `pi-web-chat stopped (pid ${pid})` : "pi-web-chat is not running");
    process.exit(0);
  }

  if (action === "status") {
    const pid = readPid();
    if (pid === null) {
      console.log("pi-web-chat is not running");
      process.exit(1);
    }
    console.log(`pi-web-chat running — ${urlFor(readPort())} (pid ${pid})`);
    process.exit(0);
  }

  const result = startServer(port);
  if (!result.ok) {
    console.error(`pi-web-chat: ${result.error}`);
    process.exit(1);
  }

  const url = urlFor(result.port);
  if (result.already) {
    console.log(`pi-web-chat already running — ${url} (pid ${result.pid})`);
  } else {
    console.log(`pi-web-chat started — ${url} (pid ${result.pid})`);
    console.log(`  stop:   pi --web stop`);
    console.log(`  status: pi --web status`);
    console.log(`  logs:   ${LOG_FILE}`);
    openBrowser(url);
  }
  // Detached server keeps running; do not open pi TUI.
  process.exit(0);
}

export default function (pi: ExtensionAPI) {
  pi.registerFlag("web", {
    description: "Start pi-web-chat UI in background and exit (no TUI)",
    type: "boolean",
    default: false,
  });

  // Handle --web as early as possible during extension load, before TUI starts.
  // getFlag() is not populated yet at factory time, so read argv directly.
  if (parseWebDaemonArgs().enabled) {
    runDaemonAndExit();
  }

  pi.registerCommand("web", {
    description: "pi-web-chat UI: /web [port] | /web stop | /web status",
    handler: async (args, ctx) => {
      const trimmed = args.trim().toLowerCase();

      if (trimmed === "stop") {
        const { stopped, pid } = stopServer();
        ctx.ui.notify(
          stopped ? `pi-web-chat stopped (pid ${pid})` : "pi-web-chat is not running",
          "info",
        );
        return;
      }

      if (trimmed === "status") {
        const pid = readPid();
        if (pid === null) {
          ctx.ui.notify("pi-web-chat is not running", "info");
          return;
        }
        ctx.ui.notify(
          `pi-web-chat running — ${urlFor(readPort())} (pid ${pid})`,
          "info",
        );
        return;
      }

      const port =
        trimmed && /^\d+$/.test(trimmed)
          ? trimmed
          : (process.env.PORT ?? DEFAULT_PORT);

      const result = startServer(port);
      if (!result.ok) {
        ctx.ui.notify(`pi-web-chat: ${result.error}`, "error");
        return;
      }

      const url = urlFor(result.port);
      ctx.ui.notify(
        result.already
          ? `pi-web-chat already running — ${url}`
          : `pi-web-chat started — ${url}`,
        "info",
      );
    },
  });
}
