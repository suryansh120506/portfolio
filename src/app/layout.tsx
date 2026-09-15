import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Document shell only — fonts, metadata, <html>/<body>.
 *
 * Everything that makes the portfolio what it is (Lenis smooth scroll, the
 * WebGL field, the nav, the boot overlay) lives in `(site)/layout.tsx`
 * instead. That split exists so /studio can opt out of all of it: Sanity
 * Studio manages its own scrolling in its own panes, and running it inside
 * Lenis — behind a particle canvas, under the site nav, with the preloader
 * over the top — makes it unusable.
 *
 * `(site)` is a route group, so it adds nothing to the URL. The portfolio is
 * still served at /.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suryansh Tripathi — Systems & Identity Telemetry",
  description:
    "Quantitative & Systems Engineer. Architecting high-availability ledgers and predictive ML pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-bone text-ink">{children}</body>
    </html>
  );
}
