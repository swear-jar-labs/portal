// Soft navigation to a route without an interceptor keeps the slot's active
// page mounted (Next parallel-route semantics), so the store must be cleared
// explicitly: this catch-all replaces the slot content on every such route
// and the clearer drops the overlay chain. default.tsx does the same for a
// hard load, where Next cannot know the slot's active state, and page.tsx
// covers the root URL (a required catch-all does not match it).
export { OverlayClear as default } from "@/features/shell";
