/**
 * Studio content.
 *
 * Sourced from K Architecture's own published material. Team members appear as
 * the practice presents them — first name and role — and no qualification,
 * award or claim has been added to what the studio states itself.
 */

export const studio = {
  lede: "A boutique architectural practice on the Sunshine Coast, working across every scale of residential project.",

  statement: [
    "K Architecture specialises in all projects residential in nature — from private houses and renovations through to large mixed use and apartment projects, as well as commercial and industrial work.",
    "The studio fosters creative energy and produces efficient and effective outcomes for all clients and budgets, across all scales of project. Despite a modest-sized team, the practice is capable of producing ambitiously scaled projects with a high level of output and quality.",
  ],

  /** What the practice designs for, in its own terms. */
  positions: [
    {
      index: "01",
      title: "Natural light",
      body: "Light is treated as a planning problem, resolved through orientation and opening rather than corrected later.",
    },
    {
      index: "02",
      title: "Cross ventilation",
      body: "Plans are made to let air pass through them — the most reliable comfort strategy available in this climate.",
    },
    {
      index: "03",
      title: "Landscape",
      body: "The landscape is integrated into the design rather than applied around it, so that it improves everyday living.",
    },
    {
      index: "04",
      title: "Local material",
      body: "Sustainable practice, favouring locally sourced materials chosen to age well on this coast.",
    },
  ],

  figures: [
    { label: "Apartments completed, under construction or proposed", value: "1,000+" },
    { label: "Years in Sunshine Coast Open House", value: "06" },
    { label: "Registration", value: "QLD & VIC" },
  ],

  team: [
    {
      name: "Greg",
      role: "Practice Director & Senior Architect",
      note: "Brings progressive thinking, design flair and a hands-on approach to all projects.",
      qualification: "Bachelor of Architecture, QUT",
    },
    {
      name: "Eliza",
      role: "Registered Architect & Interior Designer",
      qualification: "Master of Architecture, QUT",
    },
    {
      name: "Ruben",
      role: "Registered Architect",
      note: "Recently attained qualification as a Registered Architect.",
    },
    {
      name: "Graeme",
      role: "Senior Architectural Technician",
      note: "Comprehensive knowledge of multiple building classes, building codes and standards.",
    },
    {
      name: "Darren",
      role: "Design & Documentation",
      note: "Adapts to any project in any phase of design or documentation, with considerable proficiency in architectural modelling and documentation.",
    },
  ],

  recognition: [
    {
      project: "Richard Henry",
      title: "Commendation — New Houses",
      body: "Sunshine Coast Regional Architecture Awards, Australian Institute of Architects",
      year: "2017",
    },
  ],

  community: [
    {
      title: "Sunshine Coast Open House",
      body: "The practice has taken part in the Sunshine Coast Open House programme for the past six years, opening leading projects to the public.",
    },
    {
      title: "Work experience",
      body: "The studio actively fosters the growth of young local talent, taking on high school students for work experience.",
    },
  ],
} as const;
