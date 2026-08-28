# Project photography

One directory per project, named for its slug:

```
public/images/projects/the-corso/hero.jpg
public/images/projects/the-corso/feature-01.jpg
public/images/projects/the-corso/gallery-01.jpg
```

Nothing else is needed — no content file references these paths, and the
manifest is regenerated before every build. See `../README.md` for the full
list of slots and for `tools/media/harvest.mjs`, which fills them from the
live site in one pass.
