import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Crt } from "@swearjar/dos";
import "@swearjar/dos/tokens.css";
import "@swearjar/dos/base.css";
import "./globals.css";
import {
  getActorSession,
  memberIdentities,
  MemberIdentityProvider,
  mockLogoff,
} from "@/features/account";
import { InboxFileIcon, InboxStatusAddon, listInboxSeed } from "@/features/inbox";
import { ModerationDosShell, reportsSeedCookieName } from "@/features/moderation";
import { ChildrenPathProvider, type ShellAddon } from "@/features/shell";
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
  // REPORTS visibility otherwise waits for the client store to hydrate and
  // blinks on reload; the per-user seed cookie carries it into first paint.
  const reportsSeed = session ? (await cookies()).has(reportsSeedCookieName(session.user)) : false;
  const inboxSeed = session ? await listInboxSeed(session.user) : undefined;
  const addons: ShellAddon[] =
    session && inboxSeed
      ? [
          {
            id: "inbox",
            tray: <InboxStatusAddon user={session.user} seed={inboxSeed} />,
            fileIcons: { INBOX: <InboxFileIcon user={session.user} seed={inboxSeed} /> },
          },
        ]
      : [];

  return (
    <html lang="en" className={`${greybeard18.variable} ${greybeard16.variable}`}>
      <body>
        <Crt>
          <MemberIdentityProvider identities={memberIdentities()}>
            <ChildrenPathProvider>
              <ModerationDosShell
                session={session}
                logoff={mockLogoff}
                overlay={overlay}
                addons={addons}
                reportsSeed={reportsSeed}
              >
                {children}
              </ModerationDosShell>
            </ChildrenPathProvider>
          </MemberIdentityProvider>
        </Crt>
      </body>
    </html>
  );
}
