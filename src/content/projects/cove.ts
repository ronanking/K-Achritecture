import type { Project } from "@/lib/projects/types";

export const cove: Project = {
  slug: "cove",
  title: "Cove",
  category: "multi-residential",
  location: "North Ward, Townsville",
  order: 8,

  summary:
    "Four boutique residences on one site — two stand-alone houses to the street, a duplex behind.",

  description: [
    "Cove places four boutique residences on a single site in North Ward, Townsville: two stand-alone houses fronting the street, and a duplex behind them.",
    "The arrangement lets the street read as houses rather than as a development, while the site still carries four dwellings.",
  ],

  hero: {
    alt: "Cove — two stand-alone houses fronting the street in North Ward, Townsville.",
    aspect: 16 / 9,
    tone: "mid",
    layout: "full",
  },

  statistics: [
    { label: "Residences", value: "04" },
    { label: "Houses to street", value: "02" },
    { label: "Duplex", value: "01" },
  ],

  features: [
    {
      index: "01",
      headline: "The street sees houses",
      body: "Two stand-alone dwellings hold the frontage, so the development presents to the street at the scale of its neighbours.",
      plate: {
        alt: "The two stand-alone houses seen from the street.",
        aspect: 3 / 2,
        tone: "light",
      },
    },
    {
      index: "02",
      headline: "The density sits behind",
      body: "A duplex occupies the rear of the site, taking the additional dwellings out of the street elevation entirely.",
      plate: {
        alt: "The duplex at the rear of the site.",
        aspect: 4 / 3,
        tone: "mid",
      },
    },
  ],

  gallery: [
    {
      alt: "Street frontage of the two stand-alone residences.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "mid",
    },
    {
      alt: "Approach between the front houses and the rear duplex.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "shadow",
    },
    {
      alt: "Interior of one of the residences.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
  ],

  credits: [{ role: "Architect", name: "K Architecture" }],
};
