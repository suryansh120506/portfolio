import { isSanityConfigured, dataset, projectId } from "@/sanity/env";
import Studio from "./Studio";

/**
 * Sanity Studio, embedded at /studio.
 *
 * The optional catch-all segment is required: the Studio is a single-page
 * app that routes internally (/studio/structure/project;abc123 and so on),
 * and every one of those paths has to resolve to this same page.
 */
export const dynamic = "force-static";

export const metadata = {
  title: "Studio",
  // An editing surface, not content — keep it out of search results.
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  // Without a project id the Studio throws on mount, which would take the
  // whole build down. Showing setup steps instead keeps this repo buildable
  // and runnable by anyone who has not provisioned Sanity yet.
  if (!isSanityConfigured) return <SetupNotice />;

  return <Studio />;
}

function SetupNotice() {
  const steps = [
    "npx sanity@latest login",
    "npx sanity@latest projects create",
    "add NEXT_PUBLIC_SANITY_PROJECT_ID=<id> to .env.local",
    "add NEXT_PUBLIC_SANITY_DATASET=production to .env.local",
    "restart the dev server, then reload /studio",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#f4f3f0",
        color: "#0a0a0a",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <div style={{ maxWidth: "34rem" }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#8a8a85",
          }}
        >
          Sanity Studio
        </p>
        <h1 style={{ margin: "1rem 0 0", fontSize: "1.6rem", fontWeight: 600 }}>
          Not configured yet
        </h1>
        <p
          style={{
            margin: "1rem 0 0",
            fontSize: 13,
            lineHeight: 1.8,
            color: "#555",
          }}
        >
          The schemas (projects, experience nodes, hackathons) are in place.
          This page needs a Sanity project id before it can mount the Studio:
        </p>
        <ol
          style={{
            margin: "1.25rem 0 0",
            padding: 0,
            listStyle: "none",
            fontSize: 12,
            lineHeight: 2.1,
          }}
        >
          {steps.map((step, i) => (
            <li key={step} style={{ display: "flex", gap: "0.9rem" }}>
              <span style={{ color: "#8a8a85" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <code>{step}</code>
            </li>
          ))}
        </ol>
        <p style={{ margin: "1.5rem 0 0", fontSize: 11, color: "#8a8a85" }}>
          Dataset target: <code>{dataset}</code> · project id:{" "}
          <code>{projectId || "(unset)"}</code>
        </p>
      </div>
    </main>
  );
}
