import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./glass.css";
export const metadata: Metadata = {
  title: "StillValid — 지금도 맞나요?",
  description:
    "Compare a saved notice with official sources. See changes, evidence, and your next confirmation step, without GPS.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dfeaff",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
