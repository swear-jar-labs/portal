const STACK_OFFSET_TOKEN = "var(--dos-panel-stack-offset)";

/** Builds a token-only CSS sum: every layer reveals one more title below it. */
export function panelStackInset(index: number): string {
  if (index === 0) return "0px";
  return `calc(${STACK_OFFSET_TOKEN} * ${index})`;
}
