import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalShell } from "@/components/layout/ConditionalShell";
import { ViewSettingsProvider } from "@/contexts/ViewSettingsContext";

export const metadata: Metadata = {
  title: "TradeLog — Intelligent Trading Journal",
  description: "AI-powered trading journal with automatic calculations and coaching",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <ViewSettingsProvider>
          <ConditionalShell>{children}</ConditionalShell>
        </ViewSettingsProvider>
      </body>
    </html>
  );
}
