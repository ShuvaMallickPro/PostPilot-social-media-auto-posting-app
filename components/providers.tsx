"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider, useTheme } from "next-themes";

import { Toaster } from "@/components/ui/sonner";

function ClerkWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3ECF8E",
          colorBackground: isDark ? "#171717" : "#ffffff",
          colorForeground: isDark ? "#ededed" : "#1f1f1f",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "shadow-xl border border-border",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
    >
      <ClerkWithTheme>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </ClerkWithTheme>
    </ThemeProvider>
  );
}
