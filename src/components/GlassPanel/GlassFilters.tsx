/**
 * SVG filters that give the glass its refraction. Mounted once, referenced by
 * every glass surface.
 *
 * The trick to making glass read as glass rather than as blur: real glass bends
 * light most at its edges, where the surface curves. So the displacement filter
 * is applied only to a thin band around the rim (see `.lg-edge`), while the
 * centre stays a clean blur. Displacing the whole surface looks like a smeared
 * photograph; displacing only the rim looks like a solid object with thickness.
 */
export function GlassFilters() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        {/* Rim refraction: soft organic noise, displacing what is behind the edge. */}
        <filter id="lg-refract" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.010"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="22"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Gentler variant for small surfaces — pills, the collapsed rail. */}
        <filter id="lg-refract-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.010 0.014"
            numOctaves="2"
            seed="4"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="11"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Beading: blobby highlights that read as droplets sitting on the pane. */}
        <filter id="lg-bead" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="1"
            seed="3"
            result="grain"
          />
          {/* Push the noise to extremes so only isolated blobs survive. */}
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    1 0 0 0 -0.55"
            result="mask"
          />
          <feGaussianBlur in="mask" stdDeviation="0.6" result="blobs" />
          <feComposite in="blobs" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
