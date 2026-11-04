import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./glass.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://stillvalid-beta.vercel.app"),
  title: "StillValid — 지금도 맞나요?",
  description:
    "Compare a saved notice with official sources. See changes, evidence, and your next confirmation step, without GPS.",
  openGraph: {
    type: "website",
    title: "StillValid — 지금도 맞나요?",
    description:
      "저장한 공고를 공식 자료와 대조하세요. Compare saved notices with official sources and review the evidence.",
    url: "/",
    siteName: "StillValid",
    images: [
      {
        url: "/icons/stillvalid-512.png",
        width: 512,
        height: 512,
        alt: "StillValid",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "StillValid — 지금도 맞나요?",
    description:
      "저장한 공고를 공식 자료와 대조하세요. Compare saved notices with official sources and review the evidence.",
    images: ["/icons/stillvalid-512.png"],
  },
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
