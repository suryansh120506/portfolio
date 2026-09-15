import { portfolioData } from "./data";
import { readMediaManifest } from "./media-manifest";
import { readRecords } from "./records";
import { readExperience } from "./experience-store";
import { toMediaArray } from "./media-shape";
import { sanityClient, imageUrl } from "@/sanity/client";
import type { RecordItem } from "@/components/RecordRail";

/**
 * One place the page asks for content, with two sources behind it.
 *
 * WHY A FALLBACK RATHER THAN A SWITCH: pointing the site straight at Sanity
 * would mean it renders nothing until a project exists, a schema is
 * deployed, and every document has been written. This resolves from Sanity
 * when it is configured AND has content, and from the existing local store
 * otherwise — per section, not all-or-nothing. So you can move the site over
 * one document type at a time and never have a broken deploy in between.
 *
 * When a Sanity document exists for a section it wins outright; the local
 * copy is the floor, not a merge partner. Merging two sources field by field
 * would make "why is this text still the old one?" genuinely hard to answer.
 *
 * SERVER ONLY — reads the media manifest from disk.
 */

export type BeyondRow = {
  id: string;
  index: string;
  title: string;
  role: string;
  detail: string;
  facts: readonly string[];
  /** Resolved URLs, local or Sanity. One renders still; several crossfade. */
  images: string[];
};

export type SiteContent = {
  hero: {
    name: string;
    title: string;
    status: string;
    photo: string | null;
  };
  stack: readonly string[];
  records: { label: string; items: RecordItem[] };
  experience: {
    id: string;
    node: string;
    company: string;
    role: string;
    timeline: string;
    location: string;
    stack: readonly string[];
    metrics: readonly string[];
  }[];
  identityNode: {
    label: string;
    headline: string;
    intro: string;
    rows: BeyondRow[];
  };
  beyondTheCode: { eyebrow: string; title: string; copy: string };
  contact: {
    email: string;
    availability: string;
    links: readonly { label: string; href: string }[];
  };
  /** True when any part of this response came from Sanity. */
  fromSanity: boolean;
};

/** Narrow helper — Sanity returns `null` for an empty query, not `[]`. */
function has<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

export async function getSiteContent(): Promise<SiteContent> {
  const [media, storedRecords, storedExperience] = await Promise.all([
    readMediaManifest(),
    readRecords(),
    readExperience(),
  ]);
  const local = portfolioData;

  // Local defaults first, so every field below has something to fall back to.
  const localPhoto = toMediaArray(media.profile)[0] ?? null;

  const content: SiteContent = {
    hero: {
      name: local.hero.name,
      title: local.hero.title,
      status: local.hero.status,
      photo: localPhoto,
    },
    stack: local.stack,
    records: { label: local.records.label, items: storedRecords },
    experience: storedExperience,
    identityNode: {
      label: local.identityNode.label,
      headline: local.identityNode.headline,
      intro: local.identityNode.intro,
      rows: local.identityNode.categories.map((category) => ({
        id: category.id,
        index: category.index,
        title: category.title,
        role: category.role,
        detail: category.detail,
        facts: category.facts,
        images: toMediaArray(media[`beyond-${category.id}`]),
      })),
    },
    beyondTheCode: local.beyondTheCode,
    contact: local.contact,
    fromSanity: false,
  };

  if (!sanityClient) return content;

  try {
    const data = await sanityClient.fetch<{
      settings: SanitySettings | null;
      records: SanityRecord[] | null;
      rows: SanityBeyondRow[] | null;
      beyondCode: SanityBeyondCode | null;
    }>(CONTENT_QUERY, {}, { next: { revalidate: 60 } });

    if (data?.settings) {
      const s = data.settings;
      content.hero = {
        name: s.name ?? content.hero.name,
        title: s.role ?? content.hero.title,
        status: s.status ?? content.hero.status,
        // A Sanity portrait wins; otherwise keep whatever the media panel has.
        photo: imageUrl(s.portrait, 760) ?? content.hero.photo,
      };
      if (has(s.stack)) content.stack = s.stack;
      content.fromSanity = true;
    }

    if (has(data?.records)) {
      content.records = {
        label: content.records.label,
        items: data.records.map((r) => ({
          id: r._id,
          name: r.name,
          organiser: r.organiser ?? "",
          outcome: r.outcome ?? "",
          year: r.year ?? "",
          logo: imageUrl(r.logo, 176),
        })),
      };
      content.fromSanity = true;
    }

    if (has(data?.rows)) {
      content.identityNode.rows = data.rows.map((row, i) => ({
        id: row._id,
        index: row.index ?? String(i + 1).padStart(2, "0"),
        title: row.title,
        role: row.role ?? "",
        detail: row.detail ?? "",
        facts: row.facts ?? [],
        // The array is the point: one image or ten, same shape out.
        images: (row.images ?? [])
          .map((image) => imageUrl(image, 1200))
          .filter((url): url is string => Boolean(url)),
      }));
      content.fromSanity = true;
    }

    if (data?.beyondCode) {
      content.beyondTheCode = {
        ...content.beyondTheCode,
        eyebrow: data.beyondCode.eyebrow ?? content.beyondTheCode.eyebrow,
        title: data.beyondCode.title ?? content.beyondTheCode.title,
        copy: data.beyondCode.copy ?? content.beyondTheCode.copy,
      };
      content.fromSanity = true;
    }
  } catch (error) {
    // A CMS outage must not take the portfolio down. Log it and serve the
    // local copy, which is always complete.
    console.error("[content] Sanity fetch failed, serving local copy:", error);
  }

  return content;
}

/* ------------------------------------------------------------------ *
 * GROQ + the shapes it returns.
 * ------------------------------------------------------------------ */

type SanityImageRef = { asset?: { _ref?: string } } | null;

type SanitySettings = {
  name?: string;
  role?: string;
  status?: string;
  portrait?: SanityImageRef;
  stack?: string[] | null;
};

type SanityRecord = {
  _id: string;
  name: string;
  organiser?: string;
  outcome?: string;
  year?: string;
  logo?: SanityImageRef;
};

type SanityBeyondRow = {
  _id: string;
  title: string;
  index?: string;
  role?: string;
  detail?: string;
  facts?: string[];
  images?: SanityImageRef[];
};

type SanityBeyondCode = { eyebrow?: string; title?: string; copy?: string };

/**
 * One round trip for the whole page rather than five. Each branch is
 * independent, so a section with no documents yet simply comes back null and
 * the local copy stands.
 */
const CONTENT_QUERY = /* groq */ `{
  "settings": *[_type == "siteSettings"][0]{
    name, role, status, portrait, stack
  },
  "records": *[_type == "record"] | order(order asc){
    _id, name, organiser, outcome, year, logo
  },
  "rows": *[_type == "beyondCategory"] | order(order asc){
    _id, title, index, role, detail, facts, images
  },
  "beyondCode": *[_type == "beyondTheCode"][0]{
    eyebrow, title, copy
  }
}`;
