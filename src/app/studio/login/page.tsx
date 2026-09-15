"use client";

import { useState } from "react";

/**
 * Password gate for /studio.
 *
 * Deliberately plain, and styled inline rather than with the site's Tailwind
 * tokens: this page sits outside the `(site)` group, so it shares none of the
 * portfolio's chrome, and inlining keeps it self-contained.
 *
 * The password is posted to `/api/studio-auth`, which is the only thing that
 * can mint the session cookie. Nothing here decides whether you are allowed
 * in — the middleware does, on every subsequent request.
 */
export default function StudioLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim() || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/studio-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Full navigation, not a router push: the cookie has to be present on
        // a fresh request for the middleware to see it.
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next?.startsWith("/studio") ? next : "/studio";
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(data.error ?? "Incorrect password.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <p style={styles.eyebrow}>Sanity Studio</p>
        <h1 style={styles.heading}>Locked</h1>
        <p style={styles.body}>
          This dashboard is private. Enter the studio password to continue.
        </p>

        <label style={styles.label} htmlFor="studio-password">
          Password
        </label>
        <input
          id="studio-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          style={styles.input}
        />

        <button
          type="submit"
          disabled={busy || !password.trim()}
          style={{
            ...styles.button,
            opacity: busy || !password.trim() ? 0.45 : 1,
            cursor: busy || !password.trim() ? "default" : "pointer",
          }}
        >
          {busy ? "Checking…" : "Unlock"}
        </button>

        {error && (
          <p role="status" style={styles.error}>
            {error}
          </p>
        )}

        <p style={styles.footnote}>
          Set <code>STUDIO_PASSWORD</code> and <code>STUDIO_SECRET</code> in
          <code> .env.local</code>. Both fall back to <code>ADMIN_TOKEN</code>.
        </p>
      </form>
    </main>
  );
}

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "#f4f3f0",
    color: "#0a0a0a",
    fontFamily: mono,
  },
  card: {
    width: "min(100%, 23rem)",
    border: "1px solid rgba(10,10,10,0.13)",
    background: "rgba(255,255,255,0.5)",
    padding: "1.75rem",
  },
  eyebrow: {
    margin: 0,
    fontSize: 9,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: "#8a8a85",
  },
  heading: { margin: "0.9rem 0 0", fontSize: "1.5rem", fontWeight: 600 },
  body: {
    margin: "0.75rem 0 1.75rem",
    fontSize: 12,
    lineHeight: 1.8,
    color: "#555",
  },
  label: {
    display: "block",
    fontSize: 9,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#8a8a85",
  },
  input: {
    marginTop: "0.5rem",
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(10,10,10,0.13)",
    background: "transparent",
    padding: "0.55rem 0.7rem",
    fontSize: 13,
    fontFamily: mono,
    color: "#0a0a0a",
    outline: "none",
  },
  button: {
    marginTop: "1rem",
    width: "100%",
    border: "1px solid rgba(10,10,10,0.13)",
    background: "transparent",
    padding: "0.6rem",
    fontSize: 9,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontFamily: mono,
    color: "#0a0a0a",
  },
  error: {
    margin: "1rem 0 0",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#8a2f2f",
  },
  footnote: {
    margin: "1.5rem 0 0",
    paddingTop: "1rem",
    borderTop: "1px solid rgba(10,10,10,0.13)",
    fontSize: 9,
    lineHeight: 1.9,
    color: "#8a8a85",
  },
};
