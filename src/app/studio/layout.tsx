/**
 * Bare wrapper for the Studio.
 *
 * Renders nothing of its own: the point is simply that /studio sits outside
 * the `(site)` group, so it inherits none of the smooth scroll, WebGL or
 * site chrome that would otherwise fight the Studio's own layout.
 */
export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
