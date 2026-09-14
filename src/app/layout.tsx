import type { Metadata, Viewport } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import "@swearjar/dos/tokens.css";
import "@swearjar/dos/base.css";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swear Jar Labs",
  description:
    "The public terminal of Swear Jar Labs — a community keeping the craft of software engineering alive.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${vt323.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
