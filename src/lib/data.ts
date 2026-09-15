/**
 * Static operational payload.
 *
 * Everything here is authored content — the only dynamic source is the GitHub
 * fetch in `page.tsx`. Kept as a plain `as const` object so the Server
 * Component can pass it across the boundary without serialization surprises.
 */
export const portfolioData = {
  hero: {
    name: "SURYANSH TRIPATHI",
    title: "Machine Learning & Data Engineer",
    photo: "/images/profile.jpg",
    status: "Open to collaboration",
  },

  stack: [
    "Python",
    "C++",
    "TypeScript",
    "JavaScript",
    "SQL",
    "Next.js 15",
    "React",
    "Tailwind CSS",
    "Node.js",
    "Prisma ORM",
    "FastAPI",
    "PyTorch",
    "TensorFlow",
    "PostgreSQL",
    "MongoDB",
  ],

  experience: [
    {
      id: "vk-global",
      node: "Node A",
      company: "VK Global Digital",
      role: "Software Engineering Intern",
      timeline: "Aug 2026 — Present",
      location: "Faridabad, India",
      stack: ["TypeScript", "Node.js", "Prisma ORM", "React Native"],
      metrics: [
        "Spearheaded Snop Vantage cross-platform CRM.",
        "Architected Node.js/TypeScript geofence engine flagging 25% anomaly claims.",
        "Engineered Prisma ORM automatic ledger rollbacks.",
      ],
    },
    {
      id: "genero",
      node: "Node B",
      company: "Genero Technology",
      role: "Data Analyst Intern",
      timeline: "May 2026 — July 2026",
      location: "New Delhi, India",
      stack: ["Python", "SQL", "LLM Tooling"],
      metrics: [
        "Engineered Python/SQL extraction scripts reducing wrangling by 5+ hours weekly.",
        "Integrated LLM assistants for EDA.",
      ],
    },
  ],

  /**
   * Accolades, as marks rather than log lines.
   *
   * Replaced the terminal box: four sentences do not need a full viewport,
   * and a logo reads faster than a line of prose that has to be typed out
   * before it can be read. `logo` is optional — a tile with none falls back
   * to a monogram, so the row looks deliberate before any mark is uploaded.
   */
  records: {
    label: "record",
    items: [
      {
        id: "foodoscope",
        name: "Foodoscope",
        organiser: "IIIT Delhi",
        outcome: "National Finalist — scalable schema architecture",
        year: "2026",
        logo: null as string | null,
      },
      {
        id: "rift",
        name: "RIFT '26",
        organiser: "24-hour build",
        outcome: "Shipped a full API deployment layer",
        year: "2026",
        logo: null as string | null,
      },
      {
        id: "escape-room",
        name: "Escape Room",
        organiser: "Tech Challenge",
        outcome: "Podium finish — C++/Python bug-fixing",
        year: "2026",
        logo: null as string | null,
      },
      {
        id: "mckinsey",
        name: "McKinsey Forward",
        organiser: "Programme",
        outcome: "Executive management frameworks",
        year: "2025",
        logo: null as string | null,
      },
    ],
  },

  identityNode: {
    label: "Beyond the terminal",
    headline: "The operator behind the systems.",
    intro:
      "Measured across acoustic, digital and physical domains — the parts that do not show up in a commit history.",
    categories: [
      {
        id: "fading-echoes",
        index: "01",
        title: "Fading Echoes",
        role: "Founder · Lead Guitarist",
        detail:
          "Founded the band and fronted it on guitar. Veteran of multiple Battle of the Bands circuits, with a live set performed at the UP International Trade Show, multiple battle of bands and collegiate events.",
        facts: ["Founder", "Lead guitar", "UP International Trade Show"],
        // A gallery, not a single image — the studio panel appends to this
        // one instead of replacing it. Band logo first, then performance
        // shots; they crossfade on the live site in this order.
        //
        // Empty by default on purpose. These used to name a placeholder file
        // that had never been committed, so every un-filled slot fired a
        // request the image optimiser answered with a 400 on every page
        // load. Uploads populate this; until then the row shows its
        // "image pending" card and asks the network for nothing.
        images: [] as string[],
      },
      {
        id: "acoustic",
        index: "02",
        title: "Raw Acoustics",
        role: "7+ years instrumental",
        detail:
          "7 plus years of instrumental practice across acoustic guitar, electric guitar, fingerstyle patterns and ukulele — the fingerstyle discipline being the one that most resembles engineering.",
        facts: ["Fingerstyle", "Electric", "Ukulele"],
        images: [] as string[],
      },
    ],
  },

  /**
   * The competitive and physical half of Beyond, condensed.
   *
   * Replaces the former "Digital Environments" (03) and "Physical
   * Conditioning" (04) rows: four interests spread over two full-bleed
   * photo rows was a lot of scroll for a footnote, and the photos were the
   * weakest images on the page. The tiles carry it now — see
   * `BeyondTheCode.tsx`, which owns the glyphs.
   */
  beyondTheCode: {
    eyebrow: "Competition & conditioning",
    title: "Beyond the code",
    copy: "Building momentum away from the keyboard. The physical routine comes down to heavy resistance training and high-altitude mountain trekking. Competitively, it's a straight line from playing on the 10th-grade school football team to taking home wins in Valorant tournaments.",
  },

  // NOTE: replace `email` before deploying — it renders as a mailto: link.
  contact: {
    email: "suryansh.t1205@gmail.com",
    availability: "Open to collaboration",
    links: [
      { label: "GitHub", href: "https://github.com/suryansh120506" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/suryansh-tripathi-331875308/",
      },
    ],
  },
} as const;

export type PortfolioData = typeof portfolioData;
export type Experience = PortfolioData["experience"][number];
export type IdentityCategory =
  PortfolioData["identityNode"]["categories"][number];

/** Serializable repo shape handed from the Server Component to the client. */
export type GitHubNode = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  /** Repository page. */
  url: string;
  /** Deployed site, from GitHub's `homepage` field. Null when unset. */
  liveUrl: string | null;
  updatedAt: string;
};

/**
 * Live URLs for repos whose GitHub `homepage` field is empty.
 *
 * Setting `homepage` on the repo itself is the better fix — it keeps GitHub
 * as the single source of truth — but this map covers anything you would
 * rather not publish there. Keyed by repo name, case-insensitive.
 */
export const LIVE_URL_OVERRIDES: Record<string, string> = {
  // quantengine: "https://…",
};
