'use client';
import { useEffect } from 'react';

declare global { interface Window { fbq?: (...args: unknown[]) => void } }

export default function PixelPurchase() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: 29.00,
        currency: 'USD',
      });
    }
  }, []);

  return null;
}
