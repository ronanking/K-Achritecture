import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHead } from "@/components/layout/PageHead";
import { ProjectIndex } from "@/components/project/ProjectIndex";
import { allProjects, categoryCounts } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "The K Architecture archive — new homes and renovations, townhouses, multi-residential developments and interior fit-outs across the Sunshine Coast and Queensland.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const projects = allProjects;
  const divisions = categoryCounts();

  return (
    <div data-surface="paper" className="min-h-svh pb-24 md:pb-32">
      <PageHead
        reference="Index — Projects"
        meta={`${String(projects.length).padStart(2, "0")} sheets`}
        title="Projects"
        lede="Private houses, renovations and apartment buildings, arranged as a schedule. Move down the list to change the plate."
      />

      {/* The filter reads from the URL, so a division can be linked to
          directly. Suspense keeps the page itself statically rendered. */}
      <Suspense
        fallback={<div className="frame min-h-[60svh]" aria-hidden />}
      >
        <ProjectIndex projects={projects} divisions={divisions} />
      </Suspense>
    </div>
  );
}
