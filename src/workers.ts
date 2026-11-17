// Real child programs for the parallel workers lab. We wait in plain code, so we ask the system if a program still runs.
// (A waiting loop that sleeps cannot hear the program end, so we look at its state instead.)

export type Child = ReturnType<typeof Bun.spawn>;

export function startWorker(args: string[]): Child {
  return Bun.spawn(args, { stdout: "ignore", stderr: "inherit" });
}

// True while the program is alive. A program that ended and was not collected yet shows as Z.
export function isRunning(child: Child): boolean {
  const done = Bun.spawnSync(["ps", "-o", "stat=", "-p", String(child.pid)]);
  const state = done.stdout.toString().trim();
  return state !== "" && !state.startsWith("Z");
}

export function stopWorker(child: Child): void {
  child.kill();
}
