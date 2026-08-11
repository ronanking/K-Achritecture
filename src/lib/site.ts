/**
 * Practice information.
 *
 * Every value here is sourced from K Architecture's own public material.
 * Nothing in this file is invented. If a detail could not be confirmed it is
 * absent rather than approximated — the interface is built to degrade
 * gracefully when a field is missing.
 *
 * See README → "Content provenance" before adding to this file.
 */

export const site = {
  name: "K Architecture",
  legalName: "K Architecture Studio",
  tagline: "Elevating the standard of modern architecture",
  region: "Sunshine Coast, Queensland",

  /**
   * Canonical origin. Overridden per-environment so that preview deployments
   * do not advertise themselves as the production site.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.karchitecture.com.au",

  email: "admin@karchitecture.com.au",

  /**
   * Sourced from the practice's public business listings. Flagged in the
   * README for confirmation against the studio's own records before launch.
   */
  phone: "0403 266 037",
  phoneHref: "+61403266037",

  address: {
    unit: "4/930",
    street: "David Low Way",
    suburb: "Marcoola",
    state: "QLD",
    postcode: "4564",
    country: "Australia",
    get line1() {
      return `${this.unit} ${this.street}`;
    },
    get line2() {
      return `${this.suburb} ${this.state} ${this.postcode}`;
    },
  },

  social: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/karchitecturestudio/",
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/karchitecturestudio/",
    },
  ],

  /**
   * The practice's own description of what it does, as published by the
   * studio.
   */
  positioning:
    "A boutique architectural practice based on the Sunshine Coast, Queensland — specialising in all projects residential in nature, from private houses and renovations through to large mixed use and apartment projects.",
} as const;

export const nav = [
  { label: "Projects", href: "/projects" },
  { label: "Studio", href: "/studio" },
  { label: "Contact", href: "/contact" },
] as const;
