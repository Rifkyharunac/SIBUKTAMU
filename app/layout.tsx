import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SIBUKTAMU — Disnakertrans Sulawesi Tengah",
    template: "%s | SIBUKTAMU",
  },
  description: "Sistem Informasi Buku Tamu Digital Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=sibuktamu-2", type: "image/svg+xml" },
      { url: "/sibuktamu-icon-32.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico?v=sibuktamu-2",
    apple: { url: "/sibuktamu-icon-180.png?v=2", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = { themeColor: "#0369a1" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
