import { Overture } from "@/components/home/Overture";
import { Statement } from "@/components/home/Statement";
import { SelectedWork } from "@/components/home/SelectedWork";
import { Method } from "@/components/home/Method";
import { Divisions } from "@/components/home/Divisions";
import { Coda } from "@/components/home/Coda";
import { allProjects, featuredProjects } from "@/lib/projects";

/**
 * The homepage is a sequence, not a stack of sections.
 *
 *   Overture   concept → drawing → space → built form
 *   Statement  compression. One measure of text, on paper.
 *   Work       the projects, laid down like sheets
 *   Method     the four questions every project answers
 *   Divisions  the scope of the practice, as a schedule
 *   Coda       the datum returns as a horizon, and the page ends
 *
 * Dark, light, dark, light, dark, light — the whole page is one rhythm of
 * shadow and daylight.
 */
export default function HomePage() {
  const lead = featuredProjects[0] ?? allProjects[0];
  const selected = featuredProjects.length ? featuredProjects : allProjects.slice(0, 4);

  return (
    <>
      <Overture project={lead} />
      <Statement />
      <SelectedWork projects={selected} />
      <Method />
      <Divisions />
      <Coda />
    </>
  );
}
