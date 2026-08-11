import { Reveal } from "@/components/typography/Reveal";

/**
 * The head of an interior sheet: reference, title, and the one line that says
 * what this is. Same proportion on every page, so moving between them feels
 * like turning pages in one set rather than visiting separate documents.
 */
export function PageHead({
  reference,
  meta,
  title,
  lede,
  children,
}: {
  reference: string;
  meta?: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="frame pt-[calc(var(--nav-h)+2.5rem)]">
      <div className="bays rule-b py-4">
        <p className="note col-span-3 opacity-45 md:col-span-2">{reference}</p>
        {meta ? (
          <p className="note col-span-3 text-right opacity-45 md:col-span-10">
            {meta}
          </p>
        ) : null}
      </div>

      <div className="bays items-end gap-y-8 py-14 md:py-20">
        <Reveal
          as="h1"
          immediate
          className="display-tight col-span-6 text-h1 md:col-span-7"
        >
          {title}
        </Reveal>
        {lede ? (
          <Reveal
            as="p"
            immediate
            delay={0.12}
            className="prose-k col-span-6 opacity-75 md:col-span-4 md:col-start-9"
          >
            {lede}
          </Reveal>
        ) : null}
      </div>

      {children}
    </header>
  );
}
