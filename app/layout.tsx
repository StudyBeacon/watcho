import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WatchTogether — Watch parties with friends",
  description:
    "A private, invite-based chat app where friends create groups, chat, voice/video call, and watch movies together with synced playback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-primary text-label">
        {children}
      </body>
    </html>
  );
}
