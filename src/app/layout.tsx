import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { tour } from '@/lib/tour';
import { GlassFilters } from '@/components/GlassPanel/GlassFilters';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

/**
 * The site's own origin, needed so social cards can be given absolute URLs —
 * a relative path in an og:image is ignored by every scraper. Falls back to the
 * production domain so a build without the variable still shares correctly.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thisisjolly.com';

const DESCRIPTION =
  'A contemporary hillside villa, shot after dark in a single continuous walkthrough. Scroll to move through the house.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${tour.property.title} — A House Tour`,
  description: DESCRIPTION,
  openGraph: {
    title: `${tour.property.title} — A House Tour`,
    description: DESCRIPTION,
    type: 'website',
    siteName: tour.property.title,
    url: '/',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'A contemporary hillside villa at night, lit from within, seen from the air',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${tour.property.title} — A House Tour`,
    description: DESCRIPTION,
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#05070c',
  colorScheme: 'dark',
};

/**
 * Open the connection to the media domain during the first paint rather than
 * when the first chapter is requested. TLS and DNS to a new origin costs a few
 * hundred milliseconds on a cold connection, and that would otherwise land
 * exactly when the visitor starts scrolling into the tour.
 */
const MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE;
const mediaOrigin =
  MEDIA_BASE && /^https?:\/\//.test(MEDIA_BASE) ? new URL(MEDIA_BASE).origin : null;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <head>
        {mediaOrigin && (
          <>
            <link rel="preconnect" href={mediaOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={mediaOrigin} />
          </>
        )}
      </head>
      <body className="antialiased">
        <GlassFilters />
        {children}
      </body>
    </html>
  );
}
