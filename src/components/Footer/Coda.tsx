/**
 * The last thing on the page — the house's own line, after the index has had
 * its say. Deliberately alone: no rules, no label, nothing to click. It sits
 * below the footer so the walk ends on a sentence rather than a link.
 */
export function Coda() {
  return (
    <section
      aria-label="Closing words"
      className="relative overflow-hidden border-t border-linen/10 bg-void"
    >
      {/* A single soft pool of light behind the line, as if lit from the floor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[62rem] -translate-x-1/2 -translate-y-1/2 opacity-70"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--color-linen) 9%, transparent), transparent)',
        }}
      />

      <blockquote className="relative mx-auto max-w-4xl px-6 py-28 text-center sm:px-10 lg:py-40">
        <p
          className="text-[clamp(1.9rem,6.2vw,4.75rem)] italic leading-[1.15] text-linen"
          style={{
            fontFamily: 'var(--font-editorial)',
            letterSpacing: '-0.015em',
            textWrap: 'balance',
            textShadow: '0 0 60px color-mix(in oklab, var(--color-linen) 18%, transparent)',
          }}
        >
          In white beauty finds it&rsquo;s Jolly
        </p>
      </blockquote>
    </section>
  );
}
