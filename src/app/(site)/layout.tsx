import SmoothScroll from "@/components/SmoothScroll";
import SceneMount from "@/components/SceneMount";
import Nav from "@/components/Nav";
import Preloader from "@/components/Preloader";
import ExperienceLayer from "@/components/ExperienceLayer";
import { SceneToggleProvider } from "@/lib/scene-toggle";

/**
 * The portfolio's own chrome, lifted out of the root layout so /studio does
 * not inherit it.
 *
 * The inner <div> is deliberately NOT a flex container: ScrollTrigger injects
 * pin-spacer elements into the normal document flow, and a flex parent
 * distorts their measured height.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SceneToggleProvider>
      <SmoothScroll>
        <div className="boot-shell">
          {/* WebGL layer (z-0) + scrim (z-1). Unmounts entirely when the
              killswitch is off, releasing the GPU context. */}
          <SceneMount />
          <ExperienceLayer />
          <Nav />
          {children}
        </div>
        {/* Boot overlay sits above every layer and releases the intro. */}
        <Preloader />
      </SmoothScroll>
    </SceneToggleProvider>
  );
}
