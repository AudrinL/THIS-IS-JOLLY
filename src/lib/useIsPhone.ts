'use client';

import { useEffect, useState } from 'react';

/** Below Tailwind's `md`. The one breakpoint the tour's chrome switches on. */
const PHONE_QUERY = '(max-width: 767px)';

/**
 * Whether the tour should draw its phone chrome.
 *
 * Width, not pointer type: a narrow desktop window has the same problem a
 * phone does — no room beside the film for a rail and a plan and a card all at
 * once — and the bottom-sheet layout answers it just as well with a mouse.
 *
 * `null` until the first client render, so the server and the first paint
 * agree. The desktop chrome is what renders in that window; it is the layout
 * the markup was written for, and on a phone it is on screen for one frame.
 */
export function useIsPhone(): boolean | null {
  const [phone, setPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return phone;
}
