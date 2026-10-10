"use client";

import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { getSavedTheme, applyTheme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme (or default to 'halloween') on app boot
    const currentTheme = getSavedTheme();
    applyTheme(currentTheme);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
