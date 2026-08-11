import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/layout/PageHead";
import { Reveal } from "@/components/typography/Reveal";
import { Plate } from "@/components/media/Plate";
import { studio } from "@/content/studio";
import { categories } from "@/lib/projects/categories";
import { site } from "@/lib/site";
import type { PlateTone } from "@/lib/projects/types";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "K Architecture is a boutique architectural practice on the Sunshine Coast, working across private houses, renovations, townhouses, multi-residential developments and interior fit-outs.",
  alternates: { canonical: "/studio" },
};

/**
 * The studio page was, frankly, an essay: two statement paragraphs, four
 * position paragraphs, four discipline sentences, five team notes and two
 * community notes, all set as running text on an empty sheet.
 *
 * The four positions have gone — they are the homepage's Method section, said
 * twice — and the disciplines now carry an image each. What is left is the
 * material that only words can carry: who is here, what they are registered
 * to do, and what the practice has been recognised for.
 */

const disciplinePlate: Record<string, { alt: string; tone: PlateTone }> = {
  "new-homes-and-renovations": {
    alt: "A private house opening to its garden.",
    tone: "light",
  },
  townhouses: {
    alt: "Attached housing addressing a suburban street.",
    tone: "mid",
  },
  "multi-residential": {
    alt: "An apartment building against the sky.",
    tone: "shadow",
  },
  "fit-outs": {
    alt: "Joinery and finishes in a completed interior fit-out.",
    tone: "mid",
  },
};

export default function StudioPage() {
  return (
    <>
      <div data-surface="paper">
        <PageHead
          reference="Studio — K Architecture"
          meta={`${site.address.suburb}, ${site.address.state}`}
          title="A modest team, at every scale."
          lede={studio.lede}
        />

        <div className="frame">
          <div className="bays items-end gap-y-12 pb-16 md:pb-24">
            <div className="col-span-6 md:col-span-6">
              <Plate
                plate={{
                  alt: "The studio's work seen at close range — light across a finished interior.",
                  aspect: 4 / 3,
                  tone: "mid",
                }}
                sizes="(min-width: 48rem) 50vw, 92vw"
                reference="KA · Studio"
              />
            </div>
            <div className="col-span-6 md:col-span-5 md:col-start-8">
              <Reveal as="p" className="prose-k text-h4 leading-[1.35]">
                {studio.statement[0]}
              </Reveal>
            </div>
          </div>

          <dl className="rule-t rule-b bays gap-y-8 py-10">
            {studio.figures.map((f) => (
              <div key={f.label} className="col-span-6 md:col-span-4">
                <dd className="display-tight text-h2">{f.value}</dd>
                <dt className="note mt-3 max-w-[24ch] opacity-45">{f.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ---- Disciplines, with the work behind them ------------------- */}
      <section data-surface="ink" aria-labelledby="disciplines-heading">
        <div className="frame py-16 md:py-24">
          <div className="rule-b flex items-baseline justify-between pb-3">
            <h2 id="disciplines-heading" className="note opacity-45">
              Disciplines
            </h2>
            <p className="note opacity-45">04</p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-10 lg:grid-cols-4">
            {categories.map((c) => (
              <article key={c.id}>
                <Plate
                  plate={{ ...disciplinePlate[c.id], aspect: 3 / 4 }}
                  sizes="(min-width: 80rem) 22vw, 44vw"
                  reference="KA"
                />
                <h3 className="display-tight mt-4 text-h4">{c.title}</h3>
                <p className="note mt-2 max-w-[26ch] opacity-50">{c.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Team ------------------------------------------------------ */}
      <section data-surface="chalk" aria-labelledby="team-heading">
        <div className="frame py-16 md:py-24">
          <div className="rule-b flex items-baseline justify-between pb-3">
            <h2 id="team-heading" className="note opacity-45">
              Team
            </h2>
            <p className="note opacity-45">
              Registered Architects — Queensland &amp; Victoria
            </p>
          </div>

          <ul>
            {studio.team.map((m) => (
              <li key={m.name} className="rule-b">
                <div className="bays items-baseline gap-y-2 py-6">
                  <h3 className="display-tight col-span-3 text-h3 md:col-span-4">
                    {m.name}
                  </h3>
                  <p className="note col-span-3 opacity-55 md:col-span-5">
                    {m.role}
                  </p>
                  <p className="note col-span-6 opacity-40 md:col-span-3 md:text-right">
                    {"qualification" in m ? m.qualification : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Recognition and community --------------------------------- */}
      <section data-surface="paper" aria-labelledby="recognition-heading">
        <div className="frame py-16 md:py-24">
          <div className="bays gap-y-12">
            <div className="col-span-6 md:col-span-4">
              <h2
                id="recognition-heading"
                className="note rule-b mb-6 pb-3 opacity-45"
              >
                Recognition
              </h2>
              {studio.recognition.map((r) => (
                <div key={r.project}>
                  <p className="display-tight text-h3">{r.project}</p>
                  <p className="note mt-3 opacity-55">{r.title}</p>
                  <p className="note mt-1 opacity-40">{r.year}</p>
                </div>
              ))}
            </div>

            <div className="col-span-6 md:col-span-4">
              <h2 className="note rule-b mb-6 pb-3 opacity-45">Community</h2>
              <ul className="space-y-5">
                {studio.community.map((c) => (
                  <li key={c.title}>
                    <p className="display-tight text-h4">{c.title}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-6 md:col-span-3 md:col-start-10">
              <h2 className="note rule-b mb-6 pb-3 opacity-45">Studio</h2>
              <address className="note not-italic opacity-55">
                {site.address.line1}
                <br />
                {site.address.line2}
              </address>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Close ----------------------------------------------------- */}
      <section data-surface="ink" aria-label="Contact the studio" className="relative">
        <Plate
          plate={{
            alt: "The Sunshine Coast at dusk, seen from one of the studio's buildings.",
            aspect: 21 / 9,
            tone: "shadow",
          }}
          sizes="100vw"
          reference="KA · Studio"
        />
        <div className="frame py-14 md:py-20">
          <div className="bays items-end gap-y-8">
            <p className="display-tight col-span-6 text-h2 md:col-span-7">
              Marcoola, between the beach and the highway.
            </p>
            <div className="col-span-6 md:col-span-4 md:col-start-9">
              <Link
                href="/contact"
                className="group inline-flex items-baseline gap-4"
                data-cursor="Enquire"
              >
                <span className="text-h4">Contact the studio</span>
                <span
                  aria-hidden
                  className="block h-px w-12 origin-left bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-150"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
