import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Tool CMS Admin",
  description: "AI 工具内容管理系统管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
