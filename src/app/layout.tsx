import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@swearjar/dos/tokens.css";
import "@swearjar/dos/base.css";
import "./globals.css";
import { getMockSession, mockLogoff } from "@/features/account";
import { DosShell } from "@/features/shell";
import { messages } from "@/content/messages";

const greybeard18 = localFont({
  src: [
    { path: "./fonts/Greybeard-18px.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Greybeard-18px-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-greybeard-18",
  display: "swap",
});

const greybeard16 = localFont({
  src: [
    { path: "./fonts/Greybeard-16px.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Greybeard-16px-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-greybeard-16",
  display: "swap",
});

export const metadata: Metadata = {
  title: messages.metadata.title,
  description: messages.metadata.description,
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getMockSession();

  return (
    <html lang="en" className={`${greybeard18.variable} ${greybeard16.variable}`}>
      <body>
        <DosShell session={session} logoff={mockLogoff}>
          {children}
        </DosShell>
      </body>
    </html>
  );
}
