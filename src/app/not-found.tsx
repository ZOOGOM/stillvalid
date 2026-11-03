import Link from "next/link";
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
