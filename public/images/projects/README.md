# Project photography

Files live under `public/images/projects/<project-slug>/`.

Reference them from the matching project file in `src/content/projects/`:

```ts
hero: {
  src: "/images/projects/wallumburn/hero.jpg",
  alt: "Wallumburn seen across its landscape…",
  aspect: 16 / 9,
}
```

The `aspect` value in the project data is what reserves the space in the
layout, so it must match the file. Until `src` is set, the site draws a
measured stand-in in exactly that space — adding the file and the path is the
whole handover.

Supply the largest version available (2400px on the long edge is ample).
Next.js generates the responsive sizes and modern formats at build time.
