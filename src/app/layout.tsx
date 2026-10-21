import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "JlightCalendar — Smart Family Dashboard",
  description:
    "An in-house, local-first smart family calendar, chore tracker, and wall kiosk dashboard.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1E1E2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" data-theme="mocha" data-archetype="creamy">
      <body className="h-full antialiased bg-cosmos-void text-cosmos-text selection:bg-starlight selection:text-starlight-focusText">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
