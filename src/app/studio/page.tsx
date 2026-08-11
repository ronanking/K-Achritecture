import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/layout/PageHead";
import { Reveal } from "@/components/typography/Reveal";
import { Plate } from "@/components/media/Plate";
import { studio } from "@/content/studio";
import { categories } from "@/lib/projects/categories";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "K Architecture is a boutique architectural practice on the Sunshine Coast, working across private houses, renovations, townhouses, multi-residential developments and interior fit-outs.",
  alternates: { canonical: "/studio" },
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
          <div className="bays gap-y-10 pb-20 md:pb-28">
            <div className="col-span-6 md:col-span-8 md:col-start-3">
              {studio.statement.map((para, i) => (
                <Reveal
                  key={i}
                  as="p"
                  delay={i * 0.05}
                  className={
                    i === 0
                      ? "prose-k text-h4 leading-[1.42]"
                      : "prose-k mt-7 opacity-75"
                  }
                >
                  {para}
                </Reveal>
              ))}
            </div>
          </div>

          <dl className="rule-t rule-b bays gap-y-8 py-10">
            {studio.figures.map((f) => (
              <div key={f.label} className="col-span-6 md:col-span-4">
                <dd className="display-tight text-h2">{f.value}</dd>
                <dt className="note mt-3 max-w-[26ch] opacity-45">{f.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ---- What the practice designs for ---------------------------- */}
      <section data-surface="ink" aria-labelledby="positions-heading">
        <div className="frame py-20 md:py-28">
          <h2
            id="positions-heading"
            className="note mb-12 opacity-45 md:mb-16"
          >
            What every project is designed for
          </h2>

          <div className="grid gap-x-[var(--gutter)] gap-y-12 md:grid-cols-2 lg:grid-cols-4">
            {studio.positions.map((p) => (
              <div key={p.index} className="rule-t pt-5">
                <p className="note mb-6 opacity-40">{p.index}</p>
                <h3 className="display-tight mb-3 text-h4">{p.title}</h3>
                <p className="text-body opacity-70">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Disciplines ---------------------------------------------- */}
      <section data-surface="paper" aria-labelledby="disciplines-heading">
        <div className="frame py-20 md:py-28">
          <h2 id="disciplines-heading" className="note mb-10 opacity-45">
            Disciplines
          </h2>
          <ul>
            {categories.map((c) => (
              <li key={c.id} className="rule-t">
                <div className="bays items-baseline gap-y-2 py-7">
                  <h3 className="display-tight col-span-6 text-h4 md:col-span-4">
                    {c.title}
                  </h3>
                  <p className="col-span-6 text-body opacity-70 md:col-span-7 md:col-start-6">
                    {c.blurb}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Team ------------------------------------------------------ */}
      <section data-surface="chalk" aria-labelledby="team-heading">
        <div className="frame py-20 md:py-28">
          <div className="bays rule-b pb-4">
            <h2 id="team-heading" className="note col-span-3 opacity-45 md:col-span-2">
              Team
            </h2>
            <p className="note col-span-3 text-right opacity-45 md:col-span-10">
              Registered Architects — Queensland &amp; Victoria
            </p>
          </div>

          <ul>
            {studio.team.map((m) => (
              <li key={m.name} className="rule-b">
                <div className="bays items-baseline gap-y-3 py-8">
                  <h3 className="display-tight col-span-6 text-h3 md:col-span-3">
                    {m.name}
                  </h3>
                  <p className="note col-span-6 opacity-55 md:col-span-3">
                    {m.role}
                  </p>
                  <p className="col-span-6 text-body opacity-70 md:col-span-4">
                    {"note" in m ? m.note : null}
                  </p>
                  <p className="note col-span-6 opacity-45 md:col-span-2 md:text-right">
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
        <div className="frame py-20 md:py-28">
          <div className="bays gap-y-14">
            <div className="col-span-6 md:col-span-5">
              <h2
                id="recognition-heading"
                className="note rule-b mb-8 pb-4 opacity-45"
              >
                Recognition
              </h2>
              <ul className="space-y-8">
                {studio.recognition.map((r) => (
                  <li key={r.project}>
                    <p className="display-tight text-h4">{r.project}</p>
                    <p className="mt-2 text-body">{r.title}</p>
                    <p className="note mt-2 opacity-55">{r.body}</p>
                    <p className="note mt-1 opacity-40">{r.year}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-6 md:col-span-5 md:col-start-8">
              <h2 className="note rule-b mb-8 pb-4 opacity-45">Community</h2>
              <ul className="space-y-8">
                {studio.community.map((c) => (
                  <li key={c.title}>
                    <p className="display-tight text-h4">{c.title}</p>
                    <p className="mt-2 text-body opacity-70">{c.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Studio plate ---------------------------------------------- */}
      <section data-surface="ink" aria-label="The studio">
        <Plate
          plate={{
            alt: "The K Architecture studio at Marcoola on the Sunshine Coast.",
            aspect: 21 / 9,
            tone: "shadow",
          }}
          sizes="100vw"
          reference="KA · Studio"
        />
        <div className="frame py-16 md:py-24">
          <div className="bays items-end gap-y-8">
            <p className="prose-k col-span-6 text-h3 md:col-span-7">
              The studio is at Marcoola, between the beach and the highway.
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
