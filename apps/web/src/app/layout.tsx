import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tool CMS",
  description: "AI 工具内容管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
