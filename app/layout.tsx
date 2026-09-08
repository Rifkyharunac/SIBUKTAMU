import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SIBUKTAMU — Disnakertrans Sulawesi Tengah",
    template: "%s | SIBUKTAMU",
  },
  description: "Sistem Informasi Buku Tamu Digital Dinas Tenaga Kerja dan Transmigrasi Provinsi Sulawesi Tengah.",
  icons: {
    icon: "/logo-sulteng-small.png",
    shortcut: "/logo-sulteng-small.png",
  },
};

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
