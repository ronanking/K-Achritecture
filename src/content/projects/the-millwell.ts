import type { Project } from "@/lib/projects/types";

export const theMillwell: Project = {
  slug: "the-millwell",
  title: "The Millwell",
  category: "multi-residential",
  location: "Maroochydore, Queensland",
  featured: true,
  order: 4,

  summary:
    "Two hundred and five apartments on Cornmeal Creek, given their character by a curved balcony edge that runs the full height of the building.",

  description: [
    "The Millwell is the third major Maroochydore project for Habitat Development Group and the largest to date: two hundred and five apartments over more than a thousand square metres of commercial tenancy, with a resort swimming pool and wellness retreat on the roof.",
    "Its position is unusually good. The site adjoins the Sunshine Plaza shopping centre on one side and fronts Cornmeal Creek on the other — the waterway that runs out to the Maroochy River and Cotton Tree — so the building has both a city edge and a water edge to answer.",
    "The answer is in the balconies. A continuous curve to the balcony and balustrade edge gives the building its aesthetic and sets it apart from anything else in the region.",
  ],

  hero: {
    alt: "The Millwell — a curved-balcony residential building fronting Cornmeal Creek at Maroochydore.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  statistics: [
    { label: "Apartments", value: "205" },
    { label: "Commercial tenancy", value: "1,000 m²+" },
    { label: "Rooftop", value: "Pool & wellness" },
  ],

  features: [
    {
      index: "01",
      headline: "Two edges to answer",
      body: "The Sunshine Plaza shopping centre on one boundary, Cornmeal Creek on the other. The building has to be a city address and a waterfront address at the same time.",
      plate: {
        alt: "The building seen from across Cornmeal Creek.",
        aspect: 16 / 9,
        tone: "mid",
      },
    },
    {
      index: "02",
      headline: "The curve is the building",
      body: "Curved balconies and balustrade details give the development its aesthetic — a single move, carried the full height, that distinguishes it from every other building in the region.",
      plate: {
        alt: "Detail of the continuous curved balcony and balustrade edge.",
        aspect: 3 / 4,
        tone: "light",
      },
    },
    {
      index: "03",
      headline: "The roof was kept for the residents",
      body: "A resort swimming pool and wellness retreat occupy the top of the building, above a thousand square metres of commercial tenancy at its base.",
      plate: {
        alt: "Rooftop pool and wellness retreat level.",
        aspect: 3 / 2,
        tone: "light",
      },
    },
  ],

  gallery: [
    {
      alt: "Full elevation of The Millwell from the creek side.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Balcony curve seen in close elevation.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "Commercial tenancy frontage at ground level.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
  ],

  credits: [
    { role: "Architect", name: "K Architecture" },
    { role: "Developer", name: "Habitat Development Group" },
  ],
};
