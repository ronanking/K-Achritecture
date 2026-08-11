import Link from "next/link";
import { PageHead } from "@/components/layout/PageHead";

export default function NotFound() {
  return (
    <div data-surface="paper" className="flex min-h-svh flex-col">
      <PageHead
        reference="Sheet not issued"
        meta="404"
        title="This sheet does not exist."
        lede="The drawing you asked for is not in the set. The index below has everything that is."
      />
      <div className="frame pb-24">
        <ul className="bays gap-y-4">
          {[
            { href: "/projects", label: "Projects" },
            { href: "/studio", label: "Studio" },
            { href: "/contact", label: "Contact" },
          ].map((l) => (
            <li key={l.href} className="rule-t col-span-6 pt-4 md:col-span-4">
              <Link href={l.href} className="text-h4">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
