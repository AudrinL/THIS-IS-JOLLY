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

export const metadata: Metadata = {
  title: `${tour.property.title} — A House Tour`,
  description:
    'A contemporary hillside villa, shot after dark in a single continuous walkthrough. Scroll to move through the house.',
  openGraph: {
    title: tour.property.title,
    description: 'Scroll to move through the house.',
    type: 'website',
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
