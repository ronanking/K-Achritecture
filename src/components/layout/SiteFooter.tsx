import Link from "next/link";
import { KMark } from "./KMark";
import { GridToggle } from "./GridOverlay";
import { nav, site } from "@/lib/site";

/**
 * The title block.
 *
 * Every drawing ends with one: who drew it, where they are, what it is, and
 * how to reach them, ruled into cells. The footer is that block.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer data-surface="ink" className="relative">
      <div className="frame">
        <div className="rule-t bays gap-y-10 py-12 md:py-16">
          <div className="col-span-6 md:order-1 md:col-span-3">
            <Cell label="Practice">
              <div className="mb-4 flex items-center gap-3">
                <KMark className="h-6 w-auto" />
                <span className="note" style={{ letterSpacing: "0.2em" }}>
                  {site.name}
                </span>
              </div>
              <p className="max-w-[24ch] text-body leading-snug opacity-70">
                {site.tagline}
              </p>
            </Cell>
          </div>

          <div className="col-span-3 md:order-2 md:col-span-3">
            <Cell label="Studio">
              <address className="not-italic opacity-70">
                <p>{site.address.line1}</p>
                <p>{site.address.line2}</p>
                <p>{site.address.country}</p>
              </address>
            </Cell>
          </div>

          {/* Full measure on handheld: the studio address is longer than a
              half column can hold without breaking mid-word. */}
          <div className="col-span-6 md:order-3 md:col-span-3">
            <Cell label="Contact">
              <ul className="space-y-1 opacity-70">
                <li>
                  <a
                    className="break-words hover:opacity-100"
                    href={`mailto:${site.email}`}
                  >
                    {site.email}
                  </a>
                </li>
                <li>
                  <a
                    className="hover:opacity-100"
                    href={`tel:${site.phoneHref}`}
                  >
                    {site.phone}
                  </a>
                </li>
              </ul>
            </Cell>
          </div>

          <div className="col-span-3 md:order-4 md:col-span-3">
            <Cell label="Index">
              <ul className="space-y-1 opacity-70">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link className="hover:opacity-100" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                {site.social.map((s) => (
                  <li key={s.href}>
                    <a
                      className="hover:opacity-100"
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Cell>
          </div>
        </div>

        <div className="rule-t note flex flex-wrap items-center justify-between gap-4 py-6 opacity-45">
          <span>
            © {year} {site.legalName}
          </span>
          <span className="hidden sm:block">
            Registered Architects — Queensland &amp; Victoria
          </span>
          <GridToggle />
        </div>
      </div>
    </footer>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-body">
      <h2 className="note mb-5 opacity-40">{label}</h2>
      {children}
    </div>
  );
}
