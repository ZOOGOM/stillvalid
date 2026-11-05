import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요 · Page not found — StillValid",
};

export default function NotFound() {
  return (
    <main className="error-page">
      <h1>
        이 페이지를 찾을 수 없어요.
        <br />
        Page not found.
      </h1>
      <Link className="primary" href="/">
        StillValid 홈으로 / Go home
      </Link>
    </main>
  );
}
