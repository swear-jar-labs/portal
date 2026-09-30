// Caret geometry for the mention popup: a hidden mirror of the textarea maps
// the caret offset to coordinates in the textarea's own box. Reading only —
// no focus moves, no activation, no structure queries.

export type CaretGeometry = {
  top: number;
  left: number;
  lineHeight: number;
};

// The box and text metrics the mirror must share with the field for the wrap
// to break at the same places.
const MIRRORED_STYLES = [
  "box-sizing",
  "width",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-transform",
  "text-indent",
  "line-height",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "word-break",
  "overflow-wrap",
  "tab-size",
] as const;

const NORMAL_LINE_HEIGHT_RATIO = 1.2;
// A zero-width marker for the mirror (U+200B): written as a code point, so no
// invisible literal ever lands in the source.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

function lineHeightOf(computed: CSSStyleDeclaration): number {
  const parsed = Number.parseFloat(computed.getPropertyValue("line-height"));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const fontSize = Number.parseFloat(computed.getPropertyValue("font-size"));
  return (Number.isFinite(fontSize) ? fontSize : 16) * NORMAL_LINE_HEIGHT_RATIO;
}

/** Caret coordinates in the textarea's border box, plus its line height. */
export function caretGeometry(area: HTMLTextAreaElement, caret: number): CaretGeometry {
  const computed = getComputedStyle(area);
  const mirror = document.createElement("div");
  for (const property of MIRRORED_STYLES)
    mirror.style.setProperty(property, computed.getPropertyValue(property));
  mirror.style.setProperty("position", "absolute");
  mirror.style.setProperty("visibility", "hidden");
  mirror.style.setProperty("top", "0");
  mirror.style.setProperty("left", "0");
  mirror.style.setProperty("height", "auto");
  mirror.style.setProperty("overflow", "hidden");
  mirror.style.setProperty("white-space", "pre-wrap");
  mirror.textContent = area.value.slice(0, Math.max(0, Math.min(caret, area.value.length)));
  const marker = document.createElement("span");
  marker.textContent = ZERO_WIDTH_SPACE;
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  mirror.remove();
  return {
    top: markerRect.top - mirrorRect.top,
    left: markerRect.left - mirrorRect.left,
    lineHeight: lineHeightOf(computed),
  };
}
