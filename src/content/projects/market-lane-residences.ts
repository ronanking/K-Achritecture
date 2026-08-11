import type { Project } from "@/lib/projects/types";

export const marketLaneResidences: Project = {
  slug: "market-lane-residences",
  title: "Market Lane Residences",
  category: "multi-residential",
  location: "Maroochydore, Queensland",
  status: "Completed",
  order: 5,

  summary:
    "The first major multi-residential building completed in the new Maroochydore City Centre — and therefore the one the rest will be measured against.",

  description: [
    "Market Lane Residences is the first major multi-residential development to be completed in the new Maroochydore City Centre. Being first carries an obligation: in a new urban realm with no established grain, the earliest buildings set the terms for everything that follows.",
    "The project sets a benchmark for future residential development in a city centre that is still emerging, and remains the reference point for what density in this part of the Sunshine Coast can be.",
  ],

  hero: {
    alt: "Market Lane Residences in the new Maroochydore City Centre.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  features: [
    {
      index: "01",
      headline: "First into a new city centre",
      body: "No established street grain, no neighbouring buildings to take cues from. The first major residential building in the new Maroochydore City Centre had to establish the terms itself.",
      plate: {
        alt: "The building holding its street frontage in the new city centre.",
        aspect: 3 / 2,
        tone: "mid",
      },
    },
    {
      index: "02",
      headline: "A benchmark, not a precedent",
      body: "The project set the standard against which subsequent residential development in this fast emerging urban realm is measured.",
      plate: {
        alt: "Facade detail showing the building's residential grain.",
        aspect: 4 / 3,
        tone: "light",
      },
    },
  ],

  gallery: [
    {
      alt: "Street elevation of Market Lane Residences.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Balcony and screening detail.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "Entry and ground level approach.",
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
