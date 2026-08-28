import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectHero } from "@/components/project/ProjectHero";
import { ProjectSchedule } from "@/components/project/ProjectSchedule";
import { ProjectFeatures } from "@/components/project/ProjectFeatures";
import { Massing } from "@/components/project/Massing";
import { DrawingSequence } from "@/components/project/DrawingSequence";
import { ProjectGallery } from "@/components/project/ProjectGallery";
import { NextProject } from "@/components/project/NextProject";

import {
  allProjects,
  categoryTitle,
  getProject,
  nextProject,
  sheetRef,
} from "@/lib/projects";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  const where = [project.location, project.year].filter(Boolean).join(", ");
  const description =
    project.summary ??
    project.description?.[0] ??
    `${project.title}${where ? ` — ${where}` : ""}. ${categoryTitle(
      project.category,
    )} by ${site.name}.`;

  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: `${project.title} — ${site.name}`,
      description,
      url: `${site.url}/projects/${project.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} — ${site.name}`,
      description,
    },
  };
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const reference = `KA · ${sheetRef(project)}`;
  const next = nextProject(project.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary ?? project.description?.[0],
    dateCreated: project.year,
    locationCreated: project.location
      ? { "@type": "Place", name: project.location }
      : undefined,
    creator: { "@type": "Organization", name: site.legalName, url: site.url },
    url: `${site.url}/projects/${project.slug}`,
    genre: categoryTitle(project.category),
    award: project.awards?.map((a) => `${a.title}, ${a.body} (${a.year})`),
  };

  return (
    <article>
      <ProjectHero project={project} reference={reference} />
      <ProjectSchedule project={project} reference={reference} />

      {project.features?.length ? (
        <ProjectFeatures features={project.features} reference={reference} />
      ) : null}

      {project.massing ? (
        <Massing massing={project.massing} reference={reference} />
      ) : null}

      <DrawingSequence drawings={project.drawings} reference={reference} />

      {project.gallery?.length ? (
        <ProjectGallery gallery={project.gallery} reference={reference} />
      ) : null}

      <NextProject project={next} reference={`KA · ${sheetRef(next)}`} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}
