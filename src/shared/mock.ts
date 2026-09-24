// The demo-mode switch every mock slice shares: queues, seeds and demo
// actions stay off in production. Client-safe (no node APIs), so both server
// modules and client-safe helpers can read it.
export function isMockMode(): boolean {
  return process.env.NODE_ENV !== "production";
}
