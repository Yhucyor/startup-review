import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Native Commerce Copilot",
  description: "Giải pháp quản lý và bán hàng đa sàn bằng AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
