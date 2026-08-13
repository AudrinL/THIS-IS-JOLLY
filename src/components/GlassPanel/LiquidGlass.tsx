'use client';

type Variant = 'panel' | 'soft';

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'soft' uses gentler refraction — for pills and narrow rails. */
  variant?: Variant;
  /** Corner radius in px. */
  radius?: number;
  /** Larger droplets, for surfaces big enough to show them. */
  beads?: 'none' | 'fine' | 'large';
  /** Backdrop blur in px. */
  blur?: number;
  /**
   * How present the pane is, 0..1.
   *
   * This is how a pane is faded — never `opacity` on an ancestor, which makes
   * that ancestor a backdrop root and leaves the pane unblurred until the fade
   * finishes. See the note beside `.lg-tint` in globals.css.
   */
  appear?: number;
  /** Milliseconds to ease `appear` over, for panes toggled rather than scrubbed. */
  appearMs?: number;
  as?: 'div' | 'aside' | 'article' | 'nav';
  /**
   * Classes for the content box. Padding and layout belong here, not on the
   * root: children sit inside `.lg-content` so the material layers can stack
   * beneath them, and a flex rule on the root would only ever see that one box.
   */
  contentClassName?: string;
  children?: React.ReactNode;
}

/**
 * A pane of liquid glass.
 *
 * The material is entirely static — no pointer tracking, no highlight that
 * follows the cursor, no diagonal sheen. Depth comes from the rim: refraction
 * concentrated at the border, a lit top edge and a shaded bottom edge. Glass
 * sitting in front of the architecture should look like a fixed object, not
 * something that lights up when the mouse passes over it.
 */
export function LiquidGlass({
  variant = 'panel',
  radius = 22,
  beads = 'fine',
  blur = 11,
  appear = 1,
  appearMs,
  as: Tag = 'div',
  className = '',
  contentClassName = '',
  children,
  style,
  ...rest
}: LiquidGlassProps) {
  /* The blur ramps in with the rest of the material, so the pane never appears
     as a flat rectangle waiting for its backdrop. */
  const alpha = Math.min(1, Math.max(0, appear));

  return (
    <Tag
      className={`lg ${variant === 'soft' ? 'lg-soft' : ''} ${className}`}
      style={
        {
          '--lg-radius': `${radius}px`,
          '--lg-alpha': alpha,
          '--lg-blur': `${(blur * alpha).toFixed(2)}px`,
          ...(appearMs
            ? {
                transition: `--lg-alpha ${appearMs}ms var(--ease-cinema), --lg-blur ${appearMs}ms var(--ease-cinema)`,
              }
            : null),
          ...style,
        } as React.CSSProperties
      }
      {...rest}
    >
      <span className="lg-layer lg-backdrop" />
      <span className="lg-layer lg-edge" />
      <span className="lg-layer lg-tint" />
      {beads !== 'none' && (
        <span className={`lg-layer lg-bead ${beads === 'large' ? 'lg-bead-lg' : ''}`} />
      )}
      <span className="lg-layer lg-rim" />
      <div className={`lg-content ${contentClassName}`}>{children}</div>
    </Tag>
  );
}
