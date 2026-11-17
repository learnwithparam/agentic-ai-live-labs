// A small real web service for the tool failures lab: the approved documents behind an HTTP address.
// It runs as its own program, so a slow or broken reply is a real one.
// Start it with startService. It has four moods.
// ok: every call works. flaky: the first two calls fail with 503, then it works.
// slow: every call waits before it answers. down: every call fails with 503.

import { NO_DOC } from "./data";
import { searchApprovedDocs } from "../labs/01-agent-loop";

export type Service = { url: string; stop(): void };
export type Reply = { status: number; body: string }; // status 0 means no reply came in time

// Call the service once, with a time limit. Curl does the waiting, so the limit is real.
export function fetchOnce(url: string, timeoutSeconds: number): Reply {
  const args = ["curl", "-s", "-m", String(timeoutSeconds), "-w", "\n%{http_code}", url];
  const done = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe" });
  if (done.exitCode !== 0) return { status: 0, body: "" };
  const lines = done.stdout.toString().split("\n");
  const status = Number(lines[lines.length - 1]);
  return { status, body: lines.slice(0, -1).join("\n") };
}

// Start the service in its own program on a free port, and wait until it answers.
export function startService(mood: string, slowMs = 3000): Service {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const child = Bun.spawn(["bun", "src/docs-service.ts", String(port), mood, String(slowMs)], {
    stdout: "ignore",
    stderr: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  for (let wait = 0; wait < 50; wait++) {
    if (fetchOnce(`${url}/health`, 1).status === 200) break;
    Bun.sleepSync(100);
  }
  return { url, stop: () => child.kill() };
}

// The service itself. It only runs when this file is started as a program.
function serve(port: number, mood: string, slowMs: number) {
  let calls = 0;
  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/health") return new Response("ok");
      calls += 1;
      if (mood === "slow") await Bun.sleep(slowMs);
      if (mood === "down" || (mood === "flaky" && calls <= 2)) {
        return new Response("service unavailable", { status: 503 });
      }
      const query = url.searchParams.get("query") || "";
      const country = url.searchParams.get("country") || "";
      if (query.trim() === "") return new Response("query is empty", { status: 400 });
      if (country !== "US" && country !== "DE") {
        return new Response("country must be US or DE", { status: 400 });
      }
      return new Response(searchApprovedDocs(query, country) || NO_DOC);
    },
  });
}

if (import.meta.main) serve(Number(process.argv[2]), process.argv[3], Number(process.argv[4]));
