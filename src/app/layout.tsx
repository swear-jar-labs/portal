import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swear Jar Labs",
  description: "Open-source (MIT) platform, built with Next.js and PostgreSQL.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
