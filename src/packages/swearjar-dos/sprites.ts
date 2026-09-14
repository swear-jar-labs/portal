export type SpriteData = {
  palette: Record<string, string>;
  map: string[];
};

export const sprites: Record<string, SpriteData> = {
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
};
