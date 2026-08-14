import { tour } from '@/lib/tour';

/**
 * The property's name, drawn rather than set.
 *
 * SVG rather than HTML text so its width is exact at every viewport:
 * `textLength` fixes the advance width to the viewBox, and the viewBox scales
 * to whatever space it is given, so the word holds its proportions on a phone
 * and on a wide display without a single breakpoint.
 *
 * Used twice — once in the night above the roofline, once as the last thing in
 * the footer. The mask makes the word settle into the page instead of sitting
 * on top of it: full strength across the caps, thinning through the lower
 * third, never quite reaching nothing.
 *
 * `id` exists because the gradient and mask are referenced by name. Two copies
 * on one page sharing an id would have the browser resolve both references to
 * whichever was parsed first, so each instance is given its own.
 */
export function Wordmark({
  id,
  className,
  fill = 'rgb(242 233 216 / 0.38)',
}: {
  id: string;
  className?: string;
  fill?: string;
}) {
  const fadeId = `${id}-wordmark-fade`;
  const maskId = `${id}-wordmark-mask`;

  return (
    <svg viewBox="0 0 1000 270" className={className} role="img" aria-label={tour.property.title}>
      <defs>
        <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="270">
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.92" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width="1000" height="270" fill={`url(#${fadeId})`} />
        </mask>
      </defs>

      <text
        x="500"
        y="245"
        textAnchor="middle"
        /* Sized so the set width is already close to the natural advance —
           the fit is guaranteed, but the glyphs are barely touched. */
        textLength="920"
        lengthAdjust="spacingAndGlyphs"
        fontSize="300"
        fontWeight="600"
        fill={fill}
        mask={`url(#${maskId})`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        JOLLY
      </text>
    </svg>
  );
}
