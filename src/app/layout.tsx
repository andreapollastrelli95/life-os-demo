import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { DataProvider } from "@/components/DataProvider";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "LIFE OS",
  description: "Gestionale personale.",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "LIFE OS", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b1a33" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <DataProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </DataProvider>
      </body>
    </html>
  );
}
