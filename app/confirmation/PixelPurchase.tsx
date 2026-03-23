'use client';
import { useEffect } from 'react';

export default function PixelPurchase() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: 29.00,
        currency: 'USD',
      });
    }
  }, []);

  return null;
}
