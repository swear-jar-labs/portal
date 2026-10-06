// The projects' UI entry: the published renderers other features mount.
// It lives beside the pure contract (contracts/index.ts), not in it: that
// barrel feeds pure models (board/tickets) which e2e specs load through the
// Playwright transform, so it must stay free of kit CSS. This entry carries
// the kit chain instead and re-exports the slice's leaves through relative
// imports, like the main contract. The contract test pins the published list.

export { ProjectRows } from "../list/ProjectRows";
export type { ProjectRowsProps } from "../list/ProjectRows";
