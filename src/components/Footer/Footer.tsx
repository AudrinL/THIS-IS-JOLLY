import { CHAPTER_VIEWS, SPACES, tour } from '@/lib/tour';
import { pad2 } from '@/lib/format';
import { WordmarkParticles } from '@/components/Footer/WordmarkParticles';

/**
 * What the visitor arrives at once the walk is over: the house written down.
 * Also the page's real content for search engines and for anyone who never
 * triggers the scroll experience at all.
 */
export function Footer() {
  return (
    <footer id="chapters" className="relative border-t border-linen/10 bg-void">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10 lg:py-32">
        <p
          className="max-w-[26ch] text-[clamp(1.6rem,4vw,3rem)] leading-[1.1] text-linen"
          style={{ fontFamily: 'var(--font-editorial)' }}
        >
          {tour.property.title}, walked end to end in one continuous take.
        </p>

        <ol className="mt-16 divide-y divide-linen/10 border-y border-linen/10">
          {CHAPTER_VIEWS.map((chapter, i) => (
            <li key={chapter.id} className="grid grid-cols-[3rem_1fr] items-baseline gap-4 py-5">
              <span className="tracked text-[9px] text-ash/60">{pad2(i + 1)}</span>
              <div>
                <div className="text-[15px] text-linen/90">{chapter.name}</div>
                <div className="mt-1.5 text-[11.5px] leading-snug text-bone/50">
                  {chapter.spaces
                    .filter((s) => !s.isPassage)
                    .map((s) => s.name)
                    .join(' · ')}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-10 sm:grid-cols-3">
          <Fact label="Spaces" value={String(SPACES.length)} />
          <Fact label="Levels" value={tour.property.levels.join(' · ')} />
          <Fact label="Captured" value="Continuous walkthrough, after dark" />
        </div>

        <p className="mt-20 max-w-[60ch] text-[12px] leading-relaxed text-ash/50">
          {tour.property.styleNotes}
        </p>

        <div className="mt-12 flex items-center justify-between border-t border-linen/10 pt-8">
          <span className="tracked text-[9px] text-ash/50">{tour.property.title}</span>
          <a
            href="#tour"
            className="tracked text-[9px] text-ash/60 transition-colors hover:text-linen"
          >
            Back to the top
          </a>
        </div>
      </div>

      {/*
        The name again, last thing on the page: the whole word, nothing cropped,
        thinning towards its feet, and made of dust that comes to the pointer.
      */}
      <div className="px-5 pb-10 sm:px-8 lg:px-10">
        <WordmarkParticles />
      </div>
    </footer>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tracked text-[8.5px] text-ash/60">{label}</div>
      <div className="mt-2 text-[13px] leading-snug text-linen/80">{value}</div>
    </div>
  );
}
