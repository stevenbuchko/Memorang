import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/500.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/open-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attachment Intelligence",
  description: "AI-powered document summarization and evaluation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistMono.variable} antialiased`}
        style={{ fontFamily: "'Open Sans', sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
