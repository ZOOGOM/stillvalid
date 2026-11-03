"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>
        잠시 연결이 끊겼어요.
        <br />
        Something went wrong.
      </h1>
      <p>다시 시도해 주세요. / Please try again.</p>
      <button className="primary" onClick={reset}>
        다시 시도 / Try again
      </button>
    </main>
  );
}
