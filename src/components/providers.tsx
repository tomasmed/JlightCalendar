"use client";

import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { getSavedTheme, applyTheme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved per-device theme (or default to 'mocha') on app boot
    const currentTheme = getSavedTheme();
    applyTheme(currentTheme);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
