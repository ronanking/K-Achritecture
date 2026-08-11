import type { Project } from "@/lib/projects/types";

/**
 * Held deliberately sparse.
 *
 * The award is documented; the project's own description, location, year and
 * photography are not in the material available to this build. Rather than
 * approximate them, the record carries only what is verified — and the project
 * page is designed to look composed in exactly this state.
 */
export const richardHenry: Project = {
  slug: "richard-henry",
  title: "Richard Henry",
  category: "new-homes-and-renovations",
  year: "2017",
  status: "Completed",
  order: 9,

  summary:
    "A new house, awarded a Regional Commendation at the 2017 Sunshine Coast Regional Architecture Awards.",

  hero: {
    alt: "Richard Henry — a new house by K Architecture.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  awards: [
    {
      title: "Commendation — New Houses",
      body: "Sunshine Coast Regional Architecture Awards, Australian Institute of Architects",
      year: "2017",
    },
  ],

  gallery: [
    {
      alt: "Richard Henry seen in elevation.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Interior of the house.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "Detail of the house where it meets its landscape.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
  ],

  credits: [{ role: "Architect", name: "K Architecture" }],
};
