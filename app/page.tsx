import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>Pizza-Lab</h1>
      <p style={{ margin: "0 0 1rem", color: "#555", fontSize: "0.875rem" }}>
        ピッツァ職人向けツール
      </p>
      <nav aria-label="メイン">
        <ul style={{ margin: 0, padding: 0, listStyle: "none", lineHeight: 2 }}>
          <li>
            <Link href="/daily">毎日の仕込み</Link>
          </li>
          <li>
            <Link href="/quick">Quick Mode</Link>
          </li>
          <li>
            <Link href="/calculator">Calculator</Link>
          </li>
          <li>
            <Link href="/profile">Profile</Link>
          </li>
          <li>
            <Link href="/lab">Lab</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
