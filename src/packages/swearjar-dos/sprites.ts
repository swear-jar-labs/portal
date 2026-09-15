export type SpriteData = {
  palette: Readonly<Record<string, string>>;
  map: readonly string[];
};

export const sprites = {
  jar: {
    palette: {
      K: "#000000",
      y: "#FFFF55",
      W: "#55FFFF",
      g: "#555555",
      b: "#AA5500",
    },
    map: [
      "................",
      ".....KKKKKK.....",
      "....KyyyyyyK....",
      "....KKKKKKKK....",
      "...KgWggggggK...",
      "...KgWggggggK...",
      "...KggggggggK...",
      "...Kg.bb.gggK...",
      "...Kg.bb.gggK...",
      "...Kg.bb.bbgK...",
      "...Kg.bb.bbgK...",
      "...KggggggggK...",
      "...KggggggggK...",
      "...KKKKKKKKK....",
      "................",
      "................",
    ],
  },
} as const satisfies Record<string, SpriteData>;
