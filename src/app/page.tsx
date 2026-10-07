import type { Metadata } from "next";
import { HomePage as HomePageContent } from "@/features/home";

// Root metadata (COPY.md "Лендинг /"): the meme stays visual, the hook and
// the position go into the texts. The landing renders server-side, so
// parsers and indexing see it without client effects. The og card is the
// static public/og.png assembled from the hero scene; metadataBase in the
// root layout makes its URL absolute.
export const metadata: Metadata = {
  title: "SWEARJAR.DOS — Swear Jar Labs",
  description:
    "An engineering community for curious developers: forum, public errata, code reading, real projects. AI may write the code; a human reviews and ships it.",
  openGraph: {
    title: "How will you write code when AI rises? — Swear Jar Labs",
    description:
      "An engineering community for curious developers: forum, public errata, code reading, real projects. AI may write the code; a human reviews and ships it.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: 'Pixel-art card: the SWEARJAR.DOS night desk scene and the slogan "MAKE SOFTWARE ENGINEERING GREAT AGAIN"',
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function HomePage() {
  return <HomePageContent />;
}
