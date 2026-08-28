import type { Project } from "@/lib/projects/types";

export const theCorso: Project = {
  slug: "the-corso",
  title: "The Corso",
  category: "multi-residential",
  location: "Maroochydore, Queensland",
  year: "2024",
  status: "Completed",
  featured: true,
  order: 3,

  summary:
    "Two residential towers in the new Maroochydore City Centre, joined four levels up by a terrace that belongs to everyone who lives there.",

  description: [
    "The Corso occupies a full address in the new Maroochydore City Centre and answers it with two towers rather than one mass — a taller building of one hundred and sixteen apartments, including five penthouses, and a second of forty-two above seven hundred and fifteen square metres of ground level retail.",
    "The separation is what makes the project work. Splitting the accommodation gives both buildings light and air on more sides, and it leaves a gap that becomes the project's best room: a six hundred square metre communal terrace at level four, bridging the two towers, with a residents' dining room of one hundred and thirty square metres opening onto it.",
    "At the ground, a resort pool and the retail frontage hold the street edge of a city centre that is still being written.",
  ],

  hero: {
    alt: "The Corso — two residential towers in the Maroochydore City Centre, linked by an elevated terrace.",
    aspect: 16 / 9,
    tone: "shadow",
    layout: "full",
  },

  statistics: [
    { label: "Apartments", value: "158" },
    { label: "Towers", value: "02" },
    { label: "Ground level retail", value: "715 m²" },
    { label: "Communal terrace", value: "600 m²" },
  ],

  features: [
    {
      index: "01",
      headline: "One address, two buildings",
      body: "Tower one carries one hundred and sixteen apartments including five penthouses. Tower two carries forty-two above the retail frontage. Splitting the mass gives both more perimeter, and more air.",
      plate: {
        alt: "The two towers seen from the street, separated across the site.",
        aspect: 3 / 4,
        tone: "mid",
      },
    },
    {
      index: "02",
      headline: "The gap became the best room",
      body: "A six hundred square metre terrace at level four spans between the towers, with a one hundred and thirty square metre residents' dining room opening directly onto it.",
      plate: {
        alt: "The level four communal terrace bridging between the two towers.",
        aspect: 16 / 9,
        tone: "light",
      },
    },
    {
      index: "03",
      headline: "The ground belongs to the city",
      body: "Seven hundred and fifteen square metres of retail holds the street edge, with the resort pool set behind it at ground level.",
      plate: {
        alt: "Ground level retail frontage and resort pool.",
        aspect: 3 / 2,
        tone: "mid",
      },
    },
  ],

  gallery: [
    {
      alt: "The Corso seen from the north, both towers in full elevation.",
      aspect: 3 / 2,
      layout: "wide",
      tone: "shadow",
    },
    {
      alt: "Balcony detail showing the facade rhythm.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "light",
    },
    {
      alt: "Residents' dining room opening onto the communal terrace.",
      aspect: 4 / 5,
      layout: "pair",
      tone: "mid",
    },
    {
      alt: "The towers at dusk above the Maroochydore City Centre.",
      aspect: 21 / 9,
      layout: "full",
      tone: "shadow",
    },
  ],

  /**
   * A massing diagram, not a model of the building.
   *
   * Massing is the arrangement of volumes and nothing else: how big the parts
   * are relative to one another, how high they sit, what bridges what. Every
   * figure below is derived from the project's own published description —
   * one hundred and sixteen apartments in one tower and forty-two in the
   * other, a six hundred square metre communal terrace bridging them at level
   * four, a one hundred and thirty square metre residents' dining room opening
   * onto it, and seven hundred and fifteen square metres of retail at the
   * ground. Relative tower heights follow the apartment counts.
   *
   * It does not describe the facade, the detail, the material or the survey.
   * Where the published description does not fix a position — where exactly
   * the pool sits behind the retail — the diagram shows the relationship the
   * description states and claims nothing further.
   *
   * Units are storeys. One unit of height is one level.
   */
  massing: {
    caption:
      "Two towers, split so both get light and air on more sides, bridged at level four by the terrace that becomes the building's best room.",
    basis:
      "Diagram of the arrangement described in the project text. Tower heights are derived by giving both towers the same number of apartments per level, so 116 and 42 apartments become 19 and 7 residential levels above the retail. Not a survey, and not to measured dimension.",
    volumes: [
      {
        id: "retail",
        label: "Ground level retail",
        note: "715 m² holding the street edge of a city centre still being written.",
        size: [17, 1, 9],
        position: [0, 0.5, 0],
      },
      {
        id: "pool",
        label: "Resort pool",
        note: "Set behind the retail frontage, at the ground.",
        size: [7, 0.16, 3.6],
        position: [0, 0.08, -6.6],
        open: true,
      },
      {
        id: "tower-one",
        label: "Tower one",
        note: "116 apartments, including five penthouses.",
        size: [5.6, 19, 6],
        position: [-5.3, 10.5, 0],
      },
      {
        id: "terrace",
        label: "The level four terrace",
        note: "600 m² spanning between the towers — the gap made into a room.",
        size: [6, 0.5, 5],
        position: [0, 3.75, 0],
        open: true,
      },
      {
        id: "dining",
        label: "Residents' dining room",
        note: "130 m², opening directly onto the terrace.",
        size: [2.4, 1.1, 2.6],
        position: [0, 4.55, -1.1],
        open: true,
      },
      {
        id: "tower-two",
        label: "Tower two",
        note: "42 apartments, above the retail frontage.",
        size: [5.2, 7, 6],
        position: [5.3, 4.5, 0],
      },
    ],
  },

  credits: [
    { role: "Architect", name: "K Architecture" },
    { role: "Developer", name: "Habitat Development Group" },
  ],
};
