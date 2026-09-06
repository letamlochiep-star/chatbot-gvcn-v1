import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tra cứu hồ sơ học sinh lớp 8A6 - THCS Quang Trung",
  description: "Trợ lý tra cứu thông tin học sinh lớp 8A6 theo STT và họ tên",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
