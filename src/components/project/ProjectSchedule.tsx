import { Reveal } from "@/components/typography/Reveal";
import { categoryTitle } from "@/lib/projects/categories";
import type { Project } from "@/lib/projects/types";

/**
 * The title block, and the brief.
 *
 * Every drawing carries a block of facts in a ruled corner: what this is,
 * where it is, who made it, what it is made of. Empty cells are simply not
 * drawn — a project without a builder credit gets a shorter block, not a
 * dash and an apology.
 */
export function ProjectSchedule({
  project,
  reference,
}: {
  project: Project;
  reference: string;
}) {
  const facts = [
    { label: "Sheet", value: reference },
    { label: "Division", value: categoryTitle(project.category) },
    { label: "Location", value: project.location },
    { label: "Year", value: project.year },
    { label: "Status", value: project.status },
  ].filter((f) => f.value);

  return (
    <section data-surface="paper" aria-labelledby="brief-heading">
      <div className="frame">
        {/* ---- Title block ------------------------------------------- */}
        <dl className="rule-b bays gap-y-6 py-8 md:py-10">
          {facts.map((f) => (
            <div
              key={f.label}
              className="col-span-3 md:col-span-2 lg:col-span-2"
            >
              <dt className="note mb-2 opacity-40">{f.label}</dt>
              <dd className="text-body">{f.value}</dd>
            </div>
          ))}
        </dl>

        {/* ---- Brief -------------------------------------------------- */}
        <div className="bays gap-y-10 py-16 md:py-24">
          <h2 id="brief-heading" className="note col-span-6 opacity-40 md:col-span-2">
            Brief
          </h2>

          <div className="col-span-6 md:col-span-7 lg:col-span-6">
            {project.description?.length ? (
              <div className="space-y-7">
                {project.description.map((para, i) => (
                  <Reveal
                    key={i}
                    as="p"
                    delay={i * 0.04}
                    className={
                      i === 0
                        ? "prose-k text-h4 leading-[1.42]"
                        : "prose-k opacity-80"
                    }
                  >
                    {para}
                  </Reveal>
                ))}
              </div>
            ) : project.summary ? (
              <Reveal as="p" className="prose-k text-h4 leading-[1.42]">
                {project.summary}
              </Reveal>
            ) : null}
          </div>

          {/* ---- Credits and materials ------------------------------- */}
          <div className="col-span-6 space-y-10 md:col-span-3 md:col-start-10">
            {project.credits?.length ? (
              <div>
                <h3 className="note rule-b mb-4 pb-3 opacity-40">Credits</h3>
                <dl className="space-y-3">
                  {project.credits.map((c) => (
                    <div key={`${c.role}-${c.name}`}>
                      <dt className="note opacity-45">{c.role}</dt>
                      <dd className="text-body">{c.name}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {project.materials?.length ? (
              <div>
                <h3 className="note rule-b mb-4 pb-3 opacity-40">Materials</h3>
                <ul className="space-y-2">
                  {project.materials.map((m) => (
                    <li key={m} className="text-body opacity-80">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.awards?.length ? (
              <div>
                <h3 className="note rule-b mb-4 pb-3 opacity-40">Recognition</h3>
                <ul className="space-y-4">
                  {project.awards.map((a) => (
                    <li key={a.title}>
                      <p className="text-body">{a.title}</p>
                      <p className="note mt-1 opacity-55">{a.body}</p>
                      <p className="note mt-0.5 opacity-40">{a.year}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* ---- Figures ------------------------------------------------ */}
        {project.statistics?.length ? (
          <dl className="rule-t rule-b bays gap-y-8 py-10">
            {project.statistics.map((s) => (
              <div key={s.label} className="col-span-3 md:col-span-3">
                <dt className="note mb-2 opacity-40">{s.label}</dt>
                <dd className="display-tight text-h3">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
