import type { Project } from "@/lib/projects/types";

export const riviera: Project = {
  slug: "riviera",
  title: "Riviera",
  category: "multi-residential",
  location: "Mooloolaba, Queensland",
  year: "2020",
  status: "Completed",
  order: 7,

  summary:
    "A five storey residential mid-rise at Mooloolaba, of two and three bedroom apartments.",

  description: [
    "Riviera is a five storey residential mid-rise at Mooloolaba, comprising two bedroom, two bathroom and three bedroom, two bathroom apartments.",
    "Construction commenced in 2019 and the building was completed in early 2020.",
  ],

  hero: {
    alt: "Riviera — a five storey residential building at Mooloolaba.",
    aspect: 16 / 9,
    tone: "mid",
    layout: "full",
  },

  statistics: [
    { label: "Storeys", value: "05" },
    { label: "Completed", value: "2020" },
  ],

  gallery: [
    {
      alt: "Street elevation of Riviera at Mooloolaba.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "mid",
    },
    {
      alt: "Balcony detail.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
    {
      alt: "Apartment interior looking out.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "shadow",
    },
  ],

  credits: [{ role: "Architect", name: "K Architecture" }],
};
