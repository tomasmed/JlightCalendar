import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "JlightCalendar — Smart Family & Group Dashboard",
  description:
    "An open-source, cloud-synced smart calendar, chore tracker, and wall kiosk dashboard for families, groups, and AI agents.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JlightCalendar",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
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
        <Analytics />
      </body>
    </html>
  );
}
