import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallScript } from "@/components/pwa/install-script";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Shift Master", template: "%s · Shift Master" },
  description: "Jadwal shift dan jadwal lab UPT Laboratorium.",
  applicationName: "Shift Master",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <head>
        <ThemeScript />
        <InstallScript />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
