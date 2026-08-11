import type { Project } from "@/lib/projects/types";

export const socoApartments: Project = {
  slug: "soco-apartments",
  title: "Soco Apartments",
  category: "multi-residential",
  location: "Noosa Junction, Queensland",
  status: "Completed",
  order: 6,

  summary:
    "Four luxury apartments on a modest site in central Noosa Junction. The whole building is the scale of a large house.",

  description: [
    "Soco is a quaint collection of only four luxury residential apartments on a modest sized site in central Noosa Junction.",
    "Small numbers change the problem. With four dwellings rather than forty, every apartment can be given a genuine aspect, and the building can sit inside the grain of Noosa Junction rather than override it.",
  ],

  hero: {
    alt: "Soco Apartments — a small four-apartment building in central Noosa Junction.",
    aspect: 16 / 9,
    tone: "mid",
    layout: "full",
  },

  statistics: [{ label: "Apartments", value: "04" }],

  features: [
    {
      index: "01",
      headline: "Four, not forty",
      body: "A modest site in central Noosa Junction, developed at the density it can actually carry. Each apartment gets a real orientation.",
      plate: {
        alt: "The building seen from the street in Noosa Junction.",
        aspect: 3 / 2,
        tone: "light",
      },
    },
  ],

  gallery: [
    {
      alt: "Street elevation of Soco Apartments.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "mid",
    },
    {
      alt: "Interior of one of the four apartments.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
    {
      alt: "Balcony looking out over Noosa Junction.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "shadow",
    },
  ],

  credits: [{ role: "Architect", name: "K Architecture" }],
};
