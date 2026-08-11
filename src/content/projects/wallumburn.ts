import type { Project } from "@/lib/projects/types";

export const wallumburn: Project = {
  slug: "wallumburn",
  title: "Wallumburn",
  subtitle: "House and Garden",
  category: "new-homes-and-renovations",
  location: "Cooroibah, Queensland",
  status: "Completed",
  featured: true,
  order: 1,

  summary:
    "A simple corrugated steel house, extensively reworked within and left deliberately humble without, standing in the landscape above Lake Cooroibah.",

  description: [
    "Wallumburn began as a beautifully simple corrugated steel building standing somewhat naked in its landscape. The work has been almost entirely internal — an extensive renovation that reorganises how the house is lived in while leaving the exterior as modest as it was found.",
    "What has changed is the ground. A raw palette of in-situ coloured concrete, natural stone paving and reclaimed and charred timber grounds the architecture in its site, and hardy native and endemic plantings blur the line between garden and bush until it is difficult to say where one ends.",
    "Central to the scheme is a constructed creek bed that harvests rain across the property, crossed by a split bridge of reclaimed timber that carries vehicles to the house. Arrival happens over water.",
  ],

  hero: {
    alt: "Wallumburn seen across its landscape — a low corrugated steel form held among native planting.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  features: [
    {
      index: "01",
      headline: "The exterior was left alone",
      body: "The renovation is almost entirely internal. A humble corrugated steel skin was judged to be already correct for this place, and kept.",
      plate: {
        alt: "The corrugated steel exterior of Wallumburn, unaltered by the renovation.",
        aspect: 3 / 2,
        tone: "mid",
      },
    },
    {
      index: "02",
      headline: "A raw palette, taken from the ground",
      body: "In-situ coloured concrete, natural stone paving, reclaimed and charred timber. Nothing in the material schedule asks to be noticed before the landscape does.",
      plate: {
        alt: "Detail of in-situ coloured concrete meeting natural stone paving and charred timber.",
        aspect: 4 / 3,
        tone: "shadow",
      },
    },
    {
      index: "03",
      headline: "Rain was given somewhere to go",
      body: "A constructed creek bed harvests rain across the site. A split bridge of reclaimed timber carries the driveway over it, so that every arrival crosses water before it reaches the house.",
      plate: {
        alt: "The reclaimed timber split bridge crossing the constructed rain-harvesting creek bed.",
        aspect: 16 / 9,
        tone: "mid",
      },
    },
    {
      index: "04",
      headline: "Garden and bush were not separated",
      body: "Hardy native and endemic species were chosen so that the planted ground and the surrounding bush read as one continuous landscape.",
    },
  ],

  gallery: [
    {
      alt: "Interior of Wallumburn looking out through the reworked living space toward the landscape.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Concrete floor meeting timber joinery in the renovated interior.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "Stone paving running out from the house into native planting.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
    {
      alt: "The house at distance, low in the landscape above Lake Cooroibah.",
      aspect: 21 / 9,
      layout: "full",
      tone: "shadow",
    },
  ],

  materials: [
    "In-situ coloured concrete",
    "Corrugated steel",
    "Natural stone",
    "Reclaimed timber",
    "Charred timber",
  ],

  credits: [
    { role: "Architect", name: "K Architecture" },
    { role: "Builder", name: "Anderson Shaw" },
  ],
};
