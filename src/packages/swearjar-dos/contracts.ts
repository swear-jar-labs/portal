// The kit's CSS-free public entry: the DOM-level contracts — data-* attributes
// and the focusable-controls selector — without the component graph. The main
// entry (index.ts) re-exports components, so importing it pulls CSS modules,
// which a non-bundler runtime (the Playwright e2e transform) cannot load. Tests
// and other DOM-level consumers import this entry instead of the internals.
export {
  DOS_ROW_ATTR,
  DOS_SCROLL_ATTR,
  DOS_SURFACE_ATTR,
  DOS_WINDOW_BODY_ATTR,
  DOS_ZONE_ATTR,
} from "./attributes";
export { FOCUSABLE_SELECTOR } from "./focus";
