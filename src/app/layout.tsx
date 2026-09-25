import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Crt } from "@swearjar/dos";
import "@swearjar/dos/tokens.css";
import "@swearjar/dos/base.css";
import "./globals.css";
import { getActorSession, mockLogoff } from "@/features/account";
import { InboxStatusAddon, listInboxSeed } from "@/features/inbox";
import { ChildrenPathProvider, DosShell } from "@/features/shell";
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

export default async function RootLayout({ children, overlay }: LayoutProps<"/">) {
  const session = await getActorSession();
  // The inbox counter arrives through the shell's generic slot: the frame
  // never imports the section, the section never reaches into the frame.
  const statusAddon = session ? (
    <InboxStatusAddon user={session.user} seed={await listInboxSeed(session.user)} />
  ) : undefined;

  return (
    <html lang="en" className={`${greybeard18.variable} ${greybeard16.variable}`}>
      <body>
        <Crt>
          <ChildrenPathProvider>
            <DosShell
              session={session}
              logoff={mockLogoff}
              overlay={overlay}
              statusAddon={statusAddon}
            >
              {children}
            </DosShell>
          </ChildrenPathProvider>
        </Crt>
      </body>
    </html>
  );
}
