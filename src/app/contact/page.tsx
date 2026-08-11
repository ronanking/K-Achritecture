import type { Metadata } from "next";
import { PageHead } from "@/components/layout/PageHead";
import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Enquiries to K Architecture — ${site.address.line1}, ${site.address.line2}. New homes, renovations, townhouses, multi-residential developments and interior fit-outs.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div data-surface="paper" className="min-h-svh">
      <PageHead
        reference="Contact — Enquiries"
        meta={`${site.address.suburb}, ${site.address.state}`}
        title="Tell us about the site."
        lede="The more you can say about what is there now and what you would like, the more useful the first conversation is."
      />

      <div className="frame pb-24 md:pb-32">
        <div className="bays gap-y-16">
          <div className="col-span-6 md:col-span-4">
            <dl className="space-y-8">
              <div>
                <dt className="note rule-b mb-4 pb-3 opacity-40">Studio</dt>
                <dd className="text-body">
                  <address className="not-italic">
                    {site.address.line1}
                    <br />
                    {site.address.line2}
                    <br />
                    {site.address.country}
                  </address>
                </dd>
              </div>

              <div>
                <dt className="note rule-b mb-4 pb-3 opacity-40">Direct</dt>
                <dd className="space-y-1 text-body">
                  <p>
                    <a
                      className="underline-offset-4 hover:underline"
                      href={`mailto:${site.email}`}
                    >
                      {site.email}
                    </a>
                  </p>
                  <p>
                    <a
                      className="underline-offset-4 hover:underline"
                      href={`tel:${site.phoneHref}`}
                    >
                      {site.phone}
                    </a>
                  </p>
                </dd>
              </div>

              <div>
                <dt className="note rule-b mb-4 pb-3 opacity-40">Elsewhere</dt>
                <dd className="space-y-1 text-body">
                  {site.social.map((s) => (
                    <p key={s.href}>
                      <a
                        className="underline-offset-4 hover:underline"
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {s.label}
                      </a>
                    </p>
                  ))}
                </dd>
              </div>

              <div>
                <dt className="note rule-b mb-4 pb-3 opacity-40">
                  Registration
                </dt>
                <dd className="text-body opacity-70">
                  Registered Architects — Queensland &amp; Victoria
                </dd>
              </div>
            </dl>
          </div>

          <div className="col-span-6 md:col-span-7 md:col-start-6">
            <EnquiryForm />
          </div>
        </div>
      </div>
    </div>
  );
}
