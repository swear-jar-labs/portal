import type { Metadata, Viewport } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import "@swearjar/dos/tokens.css";
import "@swearjar/dos/base.css";
import "./globals.css";
import { getMockSession, mockLogoff } from "@/features/account";
import { DosShell } from "@/features/shell";
import { messages } from "@/content/messages";

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
  title: messages.metadata.title,
  description: messages.metadata.description,
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getMockSession();

  return (
    <html lang="en" className={`${vt323.variable} ${plexMono.variable}`}>
      <body>
        <DosShell session={session} logoff={mockLogoff}>
          {children}
        </DosShell>
      </body>
    </html>
  );
}
