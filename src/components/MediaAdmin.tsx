"use client";

import { useCallback, useRef, useState } from "react";
import { toMediaArray, type MediaManifest } from "@/lib/media-shape";

/**
 * Operator-only studio panel — projects, records, experience and images.
 *
 * The panel stays locked until the password is verified, so the controls are
 * never even rendered for a visitor who stumbles onto it. That is a UX
 * choice, not the security boundary: the real gate is server-side
 * (`ADMIN_TOKEN`), and every write endpoint re-checks it independently.
 * Forging `unlocked` in the browser reveals the buttons and nothing else —
 * each one still gets a 401.
 *
 * The password lives in `sessionStorage` so it survives a reload but dies
 * with the tab, and is never written into the page markup.
 *
 * Only renders when `NEXT_PUBLIC_SHOW_ADMIN=1`, so it does not appear on a
 * public build.
 */

type ProjectRow = {
  id: string;
  title: string;
  summary: string;
  stack: string;
  year: string;
  liveUrl: string | null;
  repoUrl: string | null;
  thumbnail: string | null;
};

type RecordRow = {
  id: string;
  name: string;
  organiser: string;
  outcome: string;
  year: string;
  logo?: string | null;
};

type ExperienceRow = {
  id: string;
  node: string;
  company: string;
  role: string;
  timeline: string;
  location: string;
  stack: readonly string[];
  metrics: readonly string[];
};

/** Slots holding exactly one image. */
const SINGLE_SLOTS = [{ id: "profile", label: "Hero portrait" }] as const;

/**
 * Slots holding a set. Every Beyond row is one of these: the front end
 * renders a single image as a still and crossfades two or more, so there is
 * no reason to cap a row at one photo.
 */
const GALLERY_SLOTS = [
  { id: "beyond-fading-echoes", label: "Fading Echoes" },
  { id: "beyond-acoustic", label: "Raw Acoustics" },
] as const;

const MAX_GALLERY_ITEMS = 8;
const TOKEN_KEY = "admin-token";
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const EMPTY_PROJECT = {
  title: "",
  summary: "",
  stack: "",
  year: "",
  liveUrl: "",
  repoUrl: "",
};
const EMPTY_RECORD = { id: "", name: "", organiser: "", outcome: "", year: "" };
const EMPTY_EXPERIENCE = {
  id: "",
  node: "",
  company: "",
  role: "",
  timeline: "",
  location: "",
  stack: "",
  metrics: "",
};

const field =
  "mt-1.5 w-full border border-rule bg-transparent px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-faint focus:border-ink/50";
const label = "text-[9px] uppercase tracking-[0.2em] text-ink-faint";
const chip =
  "border border-rule px-2.5 py-1.5 text-[9px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-40";
const rowTitle = "truncate text-[11px] text-ink";
const rowMeta = "truncate text-[9px] uppercase tracking-[0.18em] text-ink-faint";

type Tab = "projects" | "records" | "experience" | "images";

export default function MediaAdmin({
  projects,
  records,
  experience,
  media,
}: {
  projects: ProjectRow[];
  records: RecordRow[];
  experience: ExperienceRow[];
  media: MediaManifest;
}) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("projects");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [record, setRecord] = useState(EMPTY_RECORD);
  const [node, setNode] = useState(EMPTY_EXPERIENCE);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const storedPassword = useCallback(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? "";
    } catch {
      return "";
    }
  }, []);

  const currentPassword = useCallback(
    () => password || storedPassword(),
    [password, storedPassword],
  );

  const unlock = useCallback(async (candidate: string) => {
    if (!candidate) return;
    setChecking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-admin-token": candidate },
      });
      if (response.ok) {
        try {
          sessionStorage.setItem(TOKEN_KEY, candidate);
        } catch {
          /* private mode — the in-memory value still works this session */
        }
        setPassword(candidate);
        setUnlocked(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error ?? "Incorrect password.");
      }
    } catch {
      setMessage("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }, []);

  const openPanel = () => {
    setOpen(true);
    // Re-unlock silently if this tab already verified once.
    const saved = storedPassword();
    if (saved) void unlock(saved);
  };

  const lock = () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
    setPassword("");
    setUnlocked(false);
    setMessage(null);
  };

  const send = async (
    url: string,
    init: RequestInit,
    okMessage: string,
    key: string,
  ) => {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...init.headers, "x-admin-token": currentPassword() },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Request failed.");
        // The password was changed or revoked mid-session — re-lock.
        if (response.status === 401) lock();
      } else {
        setMessage(okMessage);
        setTimeout(() => window.location.reload(), 650);
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(null);
    }
  };

  const postJson = (url: string, body: unknown, key: string) =>
    send(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      "Saved — reloading…",
      key,
    );

  const remove = (url: string, key: string) =>
    send(url, { method: "DELETE" }, "Removed — reloading…", key);

  /** Hidden file input plus its trigger, shared by every upload button. */
  const upload = (slot: string, key: string, text: string) => (
    <>
      <input
        ref={(element) => {
          inputs.current[key] = element;
        }}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            const body = new FormData();
            body.append("slot", slot);
            body.append("file", file);
            void send(
              "/api/media",
              { method: "POST", body },
              "Uploaded — reloading…",
              key,
            );
          }
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy === key}
        onClick={() => inputs.current[key]?.click()}
        className={chip}
      >
        {text}
      </button>
    </>
  );

  if (process.env.NEXT_PUBLIC_SHOW_ADMIN !== "1") return null;

  return (
    <div className="fixed bottom-5 left-5 z-[90] font-mono">
      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          className="border border-rule bg-bone/90 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
        >
          [ studio ]
        </button>
      ) : (
        <div className="max-h-[82vh] w-[min(94vw,32rem)] overflow-y-auto border border-rule bg-bone/95 p-5 shadow-[0_10px_40px_-12px_rgba(10,10,10,0.25)] backdrop-blur-sm">
          {/* ---------- header ---------- */}
          <div className="flex items-center justify-between gap-3">
            {unlocked ? (
              <div className="flex flex-wrap gap-1">
                {(["projects", "records", "experience", "images"] as const).map(
                  (name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTab(name)}
                      className={`px-2 py-1 text-[9px] uppercase tracking-[0.18em] transition-colors ${
                        tab === name
                          ? "text-ink underline underline-offset-4"
                          : "text-ink-faint hover:text-ink-muted"
                      }`}
                    >
                      {name}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <span className="px-1 text-[10px] uppercase tracking-[0.22em] text-ink">
                Studio
              </span>
            )}

            <div className="flex shrink-0 items-center gap-3">
              {unlocked && (
                <button
                  type="button"
                  onClick={lock}
                  className="text-[9px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink"
                >
                  Lock
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close panel"
                className="text-[11px] text-ink-faint transition-colors hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ---------- locked: password only ---------- */}
          {!unlocked ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void unlock(password.trim());
              }}
              className="mt-5"
            >
              <label className="block">
                <span className={label}>Password</span>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={field}
                />
              </label>
              <button
                type="submit"
                disabled={checking || !password.trim()}
                className={`${chip} mt-3 w-full`}
              >
                {checking ? "Checking…" : "Unlock"}
              </button>
              <p className="mt-4 border-t border-rule pt-3 text-[9px] leading-4 text-ink-faint">
                Everything is hidden until the password is verified.
              </p>
            </form>
          ) : tab === "projects" ? (
            /* ---------- projects ---------- */
            <>
              <ul className="mt-5 space-y-3">
                {projects.map((row) => (
                  <li key={row.id} className="border-t border-rule pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={rowTitle}>{row.title}</p>
                        <p className={rowMeta}>
                          {row.thumbnail ? "has thumbnail" : "no thumbnail"}
                          {row.liveUrl ? " · live" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {upload(`project:${row.id}`, row.id, "Thumb")}
                        <button
                          type="button"
                          disabled={busy === row.id}
                          onClick={() =>
                            remove(
                              `/api/projects?id=${encodeURIComponent(row.id)}`,
                              row.id,
                            )
                          }
                          className={chip}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2 border-t border-rule pt-4">
                <p className={label}>Add project</p>
                <input
                  value={project.title}
                  onChange={(e) =>
                    setProject({ ...project, title: e.target.value })
                  }
                  placeholder="Title"
                  className={field}
                />
                <textarea
                  value={project.summary}
                  onChange={(e) =>
                    setProject({ ...project, summary: e.target.value })
                  }
                  placeholder="Summary"
                  rows={3}
                  className={field}
                />
                <div className="flex gap-2">
                  <input
                    value={project.stack}
                    onChange={(e) =>
                      setProject({ ...project, stack: e.target.value })
                    }
                    placeholder="Stack · e.g. PyTorch · FastAPI"
                    className={field}
                  />
                  <input
                    value={project.year}
                    onChange={(e) =>
                      setProject({ ...project, year: e.target.value })
                    }
                    placeholder="Year"
                    className={`${field} w-24 shrink-0`}
                  />
                </div>
                <input
                  value={project.liveUrl}
                  onChange={(e) =>
                    setProject({ ...project, liveUrl: e.target.value })
                  }
                  placeholder="https:// live deployment"
                  className={field}
                />
                <input
                  value={project.repoUrl}
                  onChange={(e) =>
                    setProject({ ...project, repoUrl: e.target.value })
                  }
                  placeholder="https:// repository (optional)"
                  className={field}
                />
                <button
                  type="button"
                  disabled={busy === "new-project" || !project.title.trim()}
                  onClick={() => postJson("/api/projects", project, "new-project")}
                  className={`${chip} w-full`}
                >
                  {busy === "new-project" ? "…" : "Save project"}
                </button>
              </div>
            </>
          ) : tab === "records" ? (
            /* ---------- records ---------- */
            <>
              <ul className="mt-5 space-y-3">
                {records.map((row) => (
                  <li key={row.id} className="border-t border-rule pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={rowTitle}>{row.name}</p>
                        <p className={rowMeta}>
                          {row.logo ? "has logo" : "no logo"}
                          {row.year ? ` · ${row.year}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {/* One logo per accolade — the tile shows a single
                            mark, so this replaces rather than appends. */}
                        {upload(`record:${row.id}`, `logo-${row.id}`, "Logo")}
                        {row.logo && (
                          <button
                            type="button"
                            disabled={busy === `clear-${row.id}`}
                            onClick={() =>
                              remove(
                                `/api/media?slot=record:${encodeURIComponent(row.id)}`,
                                `clear-${row.id}`,
                              )
                            }
                            className={chip}
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setRecord({
                              id: row.id,
                              name: row.name,
                              organiser: row.organiser,
                              outcome: row.outcome,
                              year: row.year,
                            })
                          }
                          className={chip}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy === row.id}
                          onClick={() =>
                            remove(
                              `/api/records?id=${encodeURIComponent(row.id)}`,
                              row.id,
                            )
                          }
                          className={chip}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2 border-t border-rule pt-4">
                <div className="flex items-center justify-between">
                  <p className={label}>
                    {record.id ? `Edit · ${record.id}` : "Add record"}
                  </p>
                  {record.id && (
                    <button
                      type="button"
                      onClick={() => setRecord(EMPTY_RECORD)}
                      className="text-[9px] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
                    >
                      New
                    </button>
                  )}
                </div>
                <input
                  value={record.name}
                  onChange={(e) => setRecord({ ...record, name: e.target.value })}
                  placeholder="Name · e.g. Foodoscope"
                  className={field}
                />
                <div className="flex gap-2">
                  <input
                    value={record.organiser}
                    onChange={(e) =>
                      setRecord({ ...record, organiser: e.target.value })
                    }
                    placeholder="Organiser · IIIT Delhi"
                    className={field}
                  />
                  <input
                    value={record.year}
                    onChange={(e) =>
                      setRecord({ ...record, year: e.target.value })
                    }
                    placeholder="Year"
                    className={`${field} w-24 shrink-0`}
                  />
                </div>
                <input
                  value={record.outcome}
                  onChange={(e) =>
                    setRecord({ ...record, outcome: e.target.value })
                  }
                  placeholder="Outcome · National Finalist"
                  className={field}
                />
                <button
                  type="button"
                  disabled={busy === "new-record" || !record.name.trim()}
                  onClick={() => postJson("/api/records", record, "new-record")}
                  className={`${chip} w-full`}
                >
                  {busy === "new-record"
                    ? "…"
                    : record.id
                      ? "Update record"
                      : "Save record"}
                </button>
                <p className="text-[9px] leading-4 text-ink-faint">
                  Upload a logo from the row above — one per entry. Without one
                  the tile shows a monogram.
                </p>
              </div>
            </>
          ) : tab === "experience" ? (
            /* ---------- experience ---------- */
            <>
              <ul className="mt-5 space-y-3">
                {experience.map((row) => (
                  <li key={row.id} className="border-t border-rule pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={rowTitle}>{row.company}</p>
                        <p className={rowMeta}>
                          {row.node} · {row.timeline}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setNode({
                              id: row.id,
                              node: row.node,
                              company: row.company,
                              role: row.role,
                              timeline: row.timeline,
                              location: row.location,
                              stack: row.stack.join(", "),
                              metrics: row.metrics.join("\n"),
                            })
                          }
                          className={chip}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy === row.id}
                          onClick={() =>
                            remove(
                              `/api/experience?id=${encodeURIComponent(row.id)}`,
                              row.id,
                            )
                          }
                          className={chip}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-2 border-t border-rule pt-4">
                <div className="flex items-center justify-between">
                  <p className={label}>
                    {node.id ? `Edit · ${node.id}` : "Add experience"}
                  </p>
                  {node.id && (
                    <button
                      type="button"
                      onClick={() => setNode(EMPTY_EXPERIENCE)}
                      className="text-[9px] uppercase tracking-[0.18em] text-ink-faint hover:text-ink"
                    >
                      New
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={node.company}
                    onChange={(e) => setNode({ ...node, company: e.target.value })}
                    placeholder="Company"
                    className={field}
                  />
                  <input
                    value={node.node}
                    onChange={(e) => setNode({ ...node, node: e.target.value })}
                    placeholder="Node A"
                    className={`${field} w-24 shrink-0`}
                  />
                </div>
                <input
                  value={node.role}
                  onChange={(e) => setNode({ ...node, role: e.target.value })}
                  placeholder="Role"
                  className={field}
                />
                <div className="flex gap-2">
                  <input
                    value={node.timeline}
                    onChange={(e) =>
                      setNode({ ...node, timeline: e.target.value })
                    }
                    placeholder="Aug 2026 — Present"
                    className={field}
                  />
                  <input
                    value={node.location}
                    onChange={(e) =>
                      setNode({ ...node, location: e.target.value })
                    }
                    placeholder="Location"
                    className={field}
                  />
                </div>
                <input
                  value={node.stack}
                  onChange={(e) => setNode({ ...node, stack: e.target.value })}
                  placeholder="Stack, comma separated"
                  className={field}
                />
                <textarea
                  value={node.metrics}
                  onChange={(e) => setNode({ ...node, metrics: e.target.value })}
                  placeholder="Achievements — one per line"
                  rows={4}
                  className={field}
                />
                <button
                  type="button"
                  disabled={busy === "new-experience" || !node.company.trim()}
                  onClick={() =>
                    postJson("/api/experience", node, "new-experience")
                  }
                  className={`${chip} w-full`}
                >
                  {busy === "new-experience"
                    ? "…"
                    : node.id
                      ? "Update node"
                      : "Save node"}
                </button>
              </div>
            </>
          ) : (
            /* ---------- images ---------- */
            <ul className="mt-5 space-y-3">
              {SINGLE_SLOTS.map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center justify-between gap-3 border-t border-rule pt-3"
                >
                  <p className={rowTitle}>{slot.label}</p>
                  <div className="flex shrink-0 gap-2">
                    {upload(slot.id, slot.id, "Upload")}
                    <button
                      type="button"
                      disabled={busy === slot.id}
                      onClick={() => remove(`/api/media?slot=${slot.id}`, slot.id)}
                      className={chip}
                    >
                      Clear
                    </button>
                  </div>
                </li>
              ))}

              {GALLERY_SLOTS.map((slot) => {
                const images = toMediaArray(media[slot.id]);
                return (
                  <li key={slot.id} className="border-t border-rule pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className={rowTitle}>
                        {slot.label}{" "}
                        <span className="text-ink-faint">
                          ({images.length}/{MAX_GALLERY_ITEMS})
                        </span>
                      </p>
                      <div className="flex shrink-0 gap-2">
                        {images.length >= MAX_GALLERY_ITEMS ? (
                          <span className={`${chip} opacity-40`}>Full</span>
                        ) : (
                          upload(slot.id, slot.id, "Add photo")
                        )}
                      </div>
                    </div>

                    {images.length > 0 ? (
                      <ul className="mt-2.5 space-y-1.5">
                        {images.map((src) => (
                          <li
                            key={src}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                              {src.split("/").pop()}
                            </span>
                            <button
                              type="button"
                              disabled={busy === src}
                              onClick={() =>
                                remove(
                                  `/api/media?slot=${slot.id}&path=${encodeURIComponent(src)}`,
                                  src,
                                )
                              }
                              className={`${chip} shrink-0`}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2.5 text-[9px] uppercase leading-4 tracking-[0.14em] text-ink-faint">
                        No photos yet — upload in the order you want them to
                        cycle.
                      </p>
                    )}
                  </li>
                );
              })}

              <li className="border-t border-rule pt-3">
                <p className="text-[9px] leading-4 text-ink-faint">
                  A row with one photo shows it as a still. Two or more crossfade
                  every 3 seconds, in upload order.
                </p>
              </li>
            </ul>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 border-t border-rule pt-3 text-[10px] leading-5 text-ink-muted"
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
