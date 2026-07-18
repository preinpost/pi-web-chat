/**
 * pi-web-chat extension
 *
 * - `pi --web`  → start UI server daemon and exit (no TUI)
 * - `/web`      → start | stop | status | <port> [--host <addr>|--lan] inside a normal pi session
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync, spawn } from "node:child_process";
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
const HOST_FILE = join(STATE_DIR, "pi-web-chat.host");
const LOG_FILE = join(STATE_DIR, "pi-web-chat.log");
const DEFAULT_PORT = "3141";
const DEFAULT_HOST = "127.0.0.1";
const LAN_HOST = "0.0.0.0";

type StartResult =
  | { ok: true; port: string; host: string; already: boolean; pid: number }
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

function readHost(): string {
  try {
    if (existsSync(HOST_FILE)) {
      const h = readFileSync(HOST_FILE, "utf8").trim();
      if (h) return h;
    }
  } catch {
    /* ignore */
  }
  return process.env.HOST ?? DEFAULT_HOST;
}

function isLoopbackHost(host: string): boolean {
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]"
  );
}

function urlFor(port: string, host = readHost()): string {
  const displayHost =
    host === "0.0.0.0" || host === "::" || host === "[::]" ? "localhost" : host;
  const needsBrackets = displayHost.includes(":") && !displayHost.startsWith("[");
  const formatted = needsBrackets ? `[${displayHost}]` : displayHost;
  return `http://${formatted}:${port}`;
}

function describeServer(port: string, host: string, pid: number): string {
  const bindNote = isLoopbackHost(host) ? "" : ` (bind ${host})`;
  return `${urlFor(port, host)}${bindNote} (pid ${pid})`;
}

function startServer(port: string, host: string): StartResult {
  if (!existsSync(SERVER)) {
    return {
      ok: false,
      error:
        "build missing (dist/index.js). Rebuild the package (`npm run build`) or reinstall pi-web-chat.",
    };
  }

  const existing = readPid();
  if (existing !== null) {
    return {
      ok: true,
      port: readPort(),
      host: readHost(),
      already: true,
      pid: existing,
    };
  }

  mkdirSync(STATE_DIR, { recursive: true });
  const logFd = openSync(LOG_FILE, "a");

  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: { ...process.env, PORT: port, HOST: host },
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();

  if (!child.pid) {
    return { ok: false, error: "failed to spawn server process" };
  }

  writeFileSync(PID_FILE, `${child.pid}\n`, "utf8");
  writeFileSync(PORT_FILE, `${port}\n`, "utf8");
  writeFileSync(HOST_FILE, `${host}\n`, "utf8");
  return { ok: true, port, host, already: false, pid: child.pid };
}

function clearStateFiles(): void {
  for (const file of [PID_FILE, PORT_FILE, HOST_FILE]) {
    try {
      unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

function stopServer(): { stopped: boolean; pid?: number } {
  const pid = readPid();
  if (pid === null) {
    clearStateFiles();
    return { stopped: false };
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* already dead */
  }
  clearStateFiles();
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

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Host used for local readiness probes (wildcard binds → loopback). */
function probeHost(host: string): string {
  if (host === "0.0.0.0" || host === "::" || host === "[::]" || host === "localhost") {
    return "127.0.0.1";
  }
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

/**
 * Block until the daemon serves /api/health (or the process dies / timeout).
 * Implemented via a short-lived Node child so the extension factory can stay
 * synchronous and exit before the pi TUI starts.
 */
function waitForServerReady(
  port: string,
  host: string,
  pid: number,
  timeoutMs = 45_000,
): { ok: true } | { ok: false; error: string } {
  const probe = probeHost(host);
  // Inline waiter keeps the package free of extra bin files.
  const waiter = `
const port = process.argv[1];
const host = process.argv[2];
const pid = Number(process.argv[3]);
const timeoutMs = Number(process.argv[4]);
const healthUrl = "http://" + (host.includes(":") ? "[" + host + "]" : host) + ":" + port + "/api/health";
const started = Date.now();
function alive() {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
(async () => {
  let last = "not ready";
  while (Date.now() - started < timeoutMs) {
    if (!alive()) {
      process.stderr.write("dead");
      process.exit(2);
    }
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) });
      if (res.ok) process.exit(0);
      last = "HTTP " + res.status;
    } catch (err) {
      last = err && err.message ? err.message : String(err);
    }
    await sleep(150);
  }
  process.stderr.write(last);
  process.exit(1);
})();
`;

  try {
    execFileSync(
      process.execPath,
      ["--input-type=module", "-e", waiter, port, probe, String(pid), String(timeoutMs)],
      {
        encoding: "utf8",
        stdio: ["ignore", "ignore", "pipe"],
        timeout: timeoutMs + 5_000,
      },
    );
    return { ok: true };
  } catch (err) {
    const e = err as {
      status?: number | null;
      stderr?: string;
      signal?: string | null;
      message?: string;
    };
    if (e.status === 2 || !isProcessAlive(pid)) {
      clearStateFiles();
      return {
        ok: false,
        error: `server process exited before becoming ready (see ${LOG_FILE})`,
      };
    }
    const detail = (e.stderr ?? "").trim() || e.message || "unknown error";
    return {
      ok: false,
      error: `server did not become ready within ${Math.round(timeoutMs / 1000)}s (${detail})`,
    };
  }
}

type DaemonAction = "start" | "stop" | "status";

type ParsedWebArgs = {
  action: DaemonAction;
  port: string;
  host: string;
};

function defaultPort(): string {
  return process.env.PORT ?? DEFAULT_PORT;
}

function defaultHost(): string {
  return process.env.HOST ?? DEFAULT_HOST;
}

/** Parse port/host tokens shared by `pi --web ...` and `/web ...`. */
function parseWebOptions(
  tokens: string[],
  defaults: { port: string; host: string } = {
    port: defaultPort(),
    host: defaultHost(),
  },
): ParsedWebArgs | { error: string } {
  let action: DaemonAction = "start";
  let port = defaults.port;
  let host = defaults.host;
  let sawAction = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    if (token === "stop" || token === "status") {
      if (sawAction) return { error: `unexpected extra action '${token}'` };
      action = token;
      sawAction = true;
      continue;
    }

    if (token === "--lan" || token === "--public" || token === "lan" || token === "public") {
      host = LAN_HOST;
      continue;
    }

    if (token === "--host" || token === "-H" || token === "host") {
      const value = tokens[++i];
      if (!value || value.startsWith("-")) {
        return { error: `${token} requires an address (e.g. 0.0.0.0)` };
      }
      host = value;
      continue;
    }

    if (token.startsWith("--host=")) {
      const value = token.slice("--host=".length);
      if (!value) return { error: "--host requires an address (e.g. 0.0.0.0)" };
      host = value;
      continue;
    }

    if (token.startsWith("-H=")) {
      const value = token.slice("-H=".length);
      if (!value) return { error: "-H requires an address (e.g. 0.0.0.0)" };
      host = value;
      continue;
    }

    if (/^\d+$/.test(token)) {
      port = token;
      continue;
    }

    return {
      error: `unknown argument '${token}' (use port, --host <addr>, --lan, stop, status)`,
    };
  }

  return { action, port, host };
}

/** Parse `pi --web [stop|status|port] [--host <addr>|--lan]` from raw argv. */
function parseWebDaemonArgs(argv: string[] = process.argv): {
  enabled: boolean;
} & (ParsedWebArgs | { error: string }) {
  const idx = argv.findIndex((arg) => arg === "--web" || arg.startsWith("--web="));
  if (idx === -1) {
    return {
      enabled: false,
      action: "start",
      port: defaultPort(),
      host: defaultHost(),
    };
  }

  const tokens: string[] = [];

  // Allow --host/--lan before --web; later tokens (after --web) override.
  for (let i = 0; i < idx; i++) {
    const arg = argv[i]!;
    if (arg === "--lan" || arg === "--public") {
      tokens.push(arg);
      continue;
    }
    if (arg === "--host" || arg === "-H") {
      const value = argv[i + 1];
      if (value && !value.startsWith("-")) {
        tokens.push(arg, value);
        i++;
      } else {
        tokens.push(arg);
      }
      continue;
    }
    if (arg.startsWith("--host=") || arg.startsWith("-H=")) {
      tokens.push(arg);
    }
  }

  const eq = argv[idx]!.startsWith("--web=") ? argv[idx]!.slice("--web=".length) : undefined;
  if (eq !== undefined && eq.length > 0) tokens.push(eq);

  for (let i = idx + 1; i < argv.length; i++) {
    const arg = argv[i]!;
    // Stop at next top-level pi flag, but keep our own --host/--lan/-H.
    if (
      arg.startsWith("-") &&
      arg !== "--lan" &&
      arg !== "--public" &&
      arg !== "--host" &&
      arg !== "-H" &&
      !arg.startsWith("--host=") &&
      !arg.startsWith("-H=")
    ) {
      break;
    }
    tokens.push(arg);
  }

  const parsed = parseWebOptions(tokens);
  if ("error" in parsed) return { enabled: true, error: parsed.error };
  return { enabled: true, ...parsed };
}

function runDaemonAndExit(): void {
  const parsed = parseWebDaemonArgs();
  if ("error" in parsed) {
    console.error(`pi-web-chat: ${parsed.error}`);
    process.exit(1);
  }

  const { action, port, host } = parsed;

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
    console.log(`pi-web-chat running — ${describeServer(readPort(), readHost(), pid)}`);
    process.exit(0);
  }

  const result = startServer(port, host);
  if (!result.ok) {
    console.error(`pi-web-chat: ${result.error}`);
    process.exit(1);
  }

  const url = urlFor(result.port, result.host);
  const summary = describeServer(result.port, result.host, result.pid);

  if (result.already) {
    console.log(`pi-web-chat already running — ${summary}`);
    openBrowser(url);
    process.exit(0);
  }

  process.stdout.write(`pi-web-chat starting (pid ${result.pid})…`);
  const ready = waitForServerReady(result.port, result.host, result.pid);
  if (!ready.ok) {
    process.stdout.write("\n");
    console.error(`pi-web-chat: ${ready.error}`);
    process.exit(1);
  }
  process.stdout.write(" ready\n");

  console.log(`pi-web-chat started — ${summary}`);
  if (!isLoopbackHost(result.host)) {
    console.log(
      "  warning: bound beyond loopback with no app auth — use only on trusted networks",
    );
  }
  console.log(`  stop:   pi --web stop`);
  console.log(`  status: pi --web status`);
  console.log(`  logs:   ${LOG_FILE}`);
  openBrowser(url);
  // Detached server keeps running; do not open pi TUI.
  process.exit(0);
}

export default function (pi: ExtensionAPI) {
  pi.registerFlag("web", {
    description:
      "Start pi-web-chat UI in background and exit (no TUI). Options: [port] [--host <addr>|--lan]",
    type: "boolean",
    default: false,
  });

  pi.registerFlag("host", {
    description:
      "Bind address for pi-web-chat when used with --web (default 127.0.0.1; use 0.0.0.0 for LAN)",
    type: "string",
  });

  pi.registerFlag("lan", {
    description: "With --web, bind pi-web-chat to 0.0.0.0 (LAN access; no app auth)",
    type: "boolean",
    default: false,
  });

  // Handle --web as early as possible during extension load, before TUI starts.
  // getFlag() is not populated yet at factory time, so read argv directly.
  // waitForServerReady is synchronous so we exit only after the daemon is up.
  if (parseWebDaemonArgs().enabled) {
    runDaemonAndExit();
  }

  pi.registerCommand("web", {
    description:
      "pi-web-chat UI: /web [port] [--host <addr>|--lan] | /web stop | /web status",
    handler: async (args, ctx) => {
      const tokens = args.trim() ? args.trim().split(/\s+/) : [];
      const parsed = parseWebOptions(tokens);
      if ("error" in parsed) {
        ctx.ui.notify(`pi-web-chat: ${parsed.error}`, "error");
        return;
      }

      const { action, port, host } = parsed;

      if (action === "stop") {
        const { stopped, pid } = stopServer();
        ctx.ui.notify(
          stopped ? `pi-web-chat stopped (pid ${pid})` : "pi-web-chat is not running",
          "info",
        );
        return;
      }

      if (action === "status") {
        const pid = readPid();
        if (pid === null) {
          ctx.ui.notify("pi-web-chat is not running", "info");
          return;
        }
        ctx.ui.notify(
          `pi-web-chat running — ${describeServer(readPort(), readHost(), pid)}`,
          "info",
        );
        return;
      }

      const result = startServer(port, host);
      if (!result.ok) {
        ctx.ui.notify(`pi-web-chat: ${result.error}`, "error");
        return;
      }

      if (!result.already) {
        ctx.ui.notify(`pi-web-chat starting (pid ${result.pid})…`, "info");
        const ready = waitForServerReady(result.port, result.host, result.pid);
        if (!ready.ok) {
          ctx.ui.notify(`pi-web-chat: ${ready.error}`, "error");
          return;
        }
      }

      const summary = describeServer(result.port, result.host, result.pid);
      const warning =
        !result.already && !isLoopbackHost(result.host)
          ? " — warning: non-loopback bind, no app auth"
          : "";
      ctx.ui.notify(
        result.already
          ? `pi-web-chat already running — ${summary}`
          : `pi-web-chat started — ${summary}${warning}`,
        "info",
      );
    },
  });
}
