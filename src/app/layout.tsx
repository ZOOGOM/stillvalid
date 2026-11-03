import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "StillValid — 지금도 맞나요?",
  description:
    "Compare a saved notice with official sources. See changes, evidence, and your next confirmation step, without GPS.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf9f5",
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
