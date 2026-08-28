import { Reveal } from "@/components/typography/Reveal";
import { Plate } from "@/components/media/Plate";
import { site } from "@/lib/site";
import { studio } from "@/content/studio";

/**
 * The practice.
 *
 * This used to be three paragraphs on an empty sheet, which is a lot of
 * reading to ask for on the second screen of an architecture site. It is now
 * one held statement against a full-height plate, with the supporting prose
 * replaced by figures — a number carries further than a sentence, and takes a
 * tenth of the space to read.
 */
export function Statement() {
  return (
    <section data-surface="paper" aria-labelledby="practice-heading">
      <div className="frame">
        <div className="bays rule-b py-4">
          <p className="note col-span-3 opacity-45 md:col-span-2">
            00 — Practice
          </p>
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {site.region}
          </p>
        </div>

        <h2 id="practice-heading" className="sr-only-k">
          The practice
        </h2>

        <div className="bays items-end gap-y-12 py-14 md:py-20">
          <div className="col-span-6 md:col-span-5">
            <Plate
              slot="home/statement-01"
              plate={{
                alt: "A K Architecture interior, light falling across the room from a full-height opening.",
                aspect: 3 / 4,
                tone: "mid",
              }}
              sizes="(min-width: 48rem) 42vw, 92vw"
              reference="KA · Practice"
            />
          </div>

          <div className="col-span-6 md:col-span-6 md:col-start-7">
            <Reveal as="p" className="prose-k text-h3 leading-[1.18]">
              A boutique practice on the Sunshine Coast, working across every
              scale of residential — from private houses to buildings that shape
              a city block.
            </Reveal>

            <dl className="rule-t mt-12 grid grid-cols-3 gap-x-[var(--gutter)] pt-6">
              {studio.figures.map((f) => (
                <div key={f.label}>
                  <dd className="display-tight text-h3">{f.value}</dd>
                  <dt className="note mt-2 max-w-[14ch] opacity-45">
                    {f.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Released to the full width. The page opens out before the band. */}
      <Plate
        slot="home/statement-02"
        plate={{
          alt: "A K Architecture house seen long and low across its landscape.",
          aspect: 21 / 9,
          tone: "light",
        }}
        sizes="100vw"
        reference="KA · Practice"
      />
    </section>
  );
}
