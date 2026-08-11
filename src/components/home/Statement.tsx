import { Reveal } from "@/components/typography/Reveal";
import { site } from "@/lib/site";

/**
 * Compression.
 *
 * The overture is the widest, darkest thing on the site. This is deliberately
 * the narrowest and the brightest: one held measure of text on paper, with
 * nothing else in the frame. A building does the same at a threshold — you are
 * squeezed before you are released.
 */
export function Statement() {
  return (
    <section data-surface="paper" aria-labelledby="practice-heading">
      <div className="frame">
        <div className="bays rule-b py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">00 — Practice</p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {site.region}
          </p>
        </div>

        <div className="bays py-20 md:py-32 lg:py-40">
          <h2 id="practice-heading" className="sr-only-k">
            The practice
          </h2>

          <div className="col-span-6 md:col-span-9 md:col-start-3 lg:col-span-8 lg:col-start-3">
            <Reveal as="p" className="prose-k text-h3 leading-[1.22]">
              A boutique architectural practice on the Sunshine Coast,
              specialising in all projects residential in nature — from private
              houses and renovations through to large mixed use and apartment
              projects.
            </Reveal>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 md:mt-16">
              <Reveal as="p" className="text-body opacity-70" delay={0.05}>
                The studio fosters creative energy and produces efficient and
                effective outcomes for all clients and budgets, across every
                scale of project.
              </Reveal>
              <Reveal as="p" className="text-body opacity-70" delay={0.1}>
                Despite a modest-sized team, the practice is capable of
                producing ambitiously scaled projects with a high level of
                output and quality.
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
