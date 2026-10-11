import type { Metadata, Viewport } from "next";
import { Creepster } from "next/font/google";
import "./globals.css";

const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-creepster",
  display: "swap",
});

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
  themeColor: "#090d16",
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${creepster.variable}`}>
      <body className="h-full antialiased bg-[#090d16] text-slate-100 selection:bg-blue-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
