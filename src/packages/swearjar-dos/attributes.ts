// A keyboard scroll region: the panel body and the file list's scroll box. The
// shell measures row visibility against it when a step enters the viewport.
export const DOS_SCROLL_ATTR = "data-dos-scroll";
export const DOS_ZONE_ATTR = "data-dos-zone";
// Typography role hook: Text and Heading stamp the role; the role table in
// tokens.css keys off it.
export const DOS_ROLE_ATTR = "data-dos-role";
// Light surface hook: the palette lives in tokens.css; Panel and the Window
// body opt in by setting the attribute to "light".
export const DOS_SURFACE_ATTR = "data-dos-surface";
// Window body: Dialog scopes its action-button focus here (title-bar [X] excluded).
export const DOS_WINDOW_BODY_ATTR = "data-dos-window-body";
// A navigation row: the shell's panel walk steps ↑/↓ between rows and ←/→
// between the focusables of one row; Stack stamps it from the `navRow` prop.
export const DOS_ROW_ATTR = "data-dos-row";
// A row can name the control that ↑/↓ enters before its other controls.
export const DOS_ROW_PRIMARY_ATTR = "data-dos-row-primary";
// The CRT screen mark: its pseudo-element layers are the global filter; tests
// use it to check the stacking contract.
export const DOS_CRT_ATTR = "data-dos-crt";
