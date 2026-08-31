import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The SPS field tool is a static folder in public/, and public/ has no
      // directory index: /sps/index.html is the only path that exists. Left
      // alone, /sps is a 404 and /sps/ is normalised to /sps and 404s too —
      // and on Vercel's CDN /sps serves the page but resolves every relative
      // asset against the site root, which loads the markup with no styles
      // and no scripts. Redirects are checked before the filesystem, so this
      // catches both forms and lands on the one URL that works.
      { source: "/sps", destination: "/sps/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
