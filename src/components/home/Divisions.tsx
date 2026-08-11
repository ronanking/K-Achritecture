import Link from "next/link";
import { categoryCounts } from "@/lib/projects";
import { Reveal } from "@/components/typography/Reveal";

/**
 * The divisions of work, as a schedule.
 *
 * A drawing set lists everything it contains, including the sheets that are
 * issued blank. A division with nothing published yet is shown at zero rather
 * than hidden — the practice does the work either way.
 */
export function Divisions() {
  const divisions = categoryCounts();

  return (
    <section data-surface="ink" aria-labelledby="divisions-heading">
      <div className="frame">
        <div className="bays rule-b py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            02 — Divisions
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            Residential — mixed use — interior
          </p>
        </div>

        <h2 id="divisions-heading" className="sr-only-k">
          Divisions of work
        </h2>

        <ul className="py-6 md:py-10">
          {divisions.map((d) => {
            const empty = d.count === 0;
            const Row = (
              <div className="bays items-baseline gap-y-2 py-7 md:py-9">
                <span className="note col-span-1 opacity-45">
                  {d.count === 0 ? "—" : String(d.count).padStart(2, "0")}
                </span>
                <span
                  className={`display-tight col-span-5 text-h3 md:col-span-5 ${
                    empty ? "opacity-35" : ""
                  }`}
                >
                  {d.title}
                </span>
                <span
                  className={`col-span-6 text-body opacity-60 md:col-span-5 ${
                    empty ? "opacity-30" : ""
                  }`}
                >
                  {d.blurb}
                </span>
                <span
                  aria-hidden
                  className="note col-span-6 hidden justify-self-end opacity-45 md:col-span-1 md:block"
                >
                  {empty ? "" : "→"}
                </span>
              </div>
            );

            return (
              <li key={d.id} className="rule-b">
                {empty ? (
                  <div>
                    {Row}
                    <span className="sr-only-k">
                      No projects published in this division yet.
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/projects?division=${d.id}`}
                    className="group block transition-opacity duration-300 hover:opacity-100 md:opacity-90"
                  >
                    {Row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="pb-20 pt-4 md:pb-32">
          <Reveal as="p" className="prose-k max-w-[46ch] text-lede opacity-75">
            Over one thousand apartments have been completed, are under
            construction, or are proposed.
          </Reveal>
          <Link
            href="/projects"
            className="group mt-8 inline-flex items-baseline gap-4"
            data-cursor="Index"
          >
            <span className="text-h4">All projects</span>
            <span
              aria-hidden
              className="block h-px w-12 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
