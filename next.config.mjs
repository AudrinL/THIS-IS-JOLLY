/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The whole site prerenders — there are no API routes, no server components
  // that need a request, and no runtime image optimisation. `STATIC_EXPORT=1`
  // emits a plain folder of files that any CDN can serve from the edge with no
  // Node process in the path at all.
  output: process.env.STATIC_EXPORT ? 'export' : undefined,

  images: {
    formats: ['image/avif', 'image/webp'],
    // Required for `output: export`; harmless otherwise, since the app uses
    // plain <picture> elements rather than next/image.
    unoptimized: true,
  },
  // Media lives on R2/CDN, never in the deployment bundle.
  outputFileTracingExcludes: {
    '*': ['./processed/**', './source/**', './*.webm'],
  },
};

export default nextConfig;
