import type { Project } from "@/lib/projects/types";

export const jamesOnToowayCreek: Project = {
  slug: "james-on-tooway-creek",
  title: "James on Tooway Creek",
  category: "new-homes-and-renovations",
  location: "Currimundi, Queensland",
  status: "Completed",
  featured: true,
  order: 2,

  summary:
    "A house planned as a skewed U, turned toward the creek and set out around the trees that were already there.",

  description: [
    "The site is secluded, held against one of the Sunshine Coast's natural waterways. That single fact set the plan: rather than face the street, the house turns.",
    "The floor plan is a skewed U, opened toward Tooway Creek. The skew is not a gesture — it is what happens when a plan is set out around existing native trees instead of over them. Several were carefully planned around and are now the things the house looks at.",
    "The result is a home that opens fully to its landscaped setting while framing views both around the building and back into it, across the courtyard the U makes.",
  ],

  hero: {
    alt: "James on Tooway Creek seen from the water side, the skewed U-shaped plan opening toward the creek.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  features: [
    {
      index: "01",
      headline: "The plan was skewed to the creek",
      body: "A U-shaped plan, turned off square, so the principal rooms face the waterway rather than the street.",
      plate: {
        alt: "The house seen along its skewed axis, oriented toward Tooway Creek.",
        aspect: 16 / 9,
        tone: "shadow",
      },
    },
    {
      index: "02",
      headline: "Existing trees were kept, and built around",
      body: "Several stands of native trees on the site were retained. The building was set out to avoid them, which is why the geometry moves the way it does.",
      plate: {
        alt: "Native trees retained on site, standing close to the built form.",
        aspect: 4 / 3,
        tone: "mid",
      },
    },
    {
      index: "03",
      headline: "Views were framed around and within",
      body: "The open end of the U gives long views out to the creek. The two arms give views back across the courtyard, so the house also looks at itself.",
      plate: {
        alt: "View across the courtyard between the two arms of the U-shaped plan.",
        aspect: 3 / 2,
        tone: "light",
      },
    },
  ],

  gallery: [
    {
      alt: "Living space opening to the landscaped courtyard.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Detail of the eave and glazing where the house meets the garden.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "A retained native tree standing against the building.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
    {
      alt: "The house at dusk from across Tooway Creek.",
      aspect: 21 / 9,
      layout: "full",
      tone: "shadow",
    },
  ],

  credits: [{ role: "Architect", name: "K Architecture" }],
};
