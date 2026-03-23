import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import PixelPurchase from './PixelPurchase';

interface Props {
  searchParams: { session_id?: string };
}

export default async function ConfirmationPage({ searchParams }: Props) {
  let petName = '';
  let email = '';

  if (searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      petName = session.metadata?.petName ?? '';
      email = session.customer_email ?? session.metadata?.email ?? '';
    } catch (err) {
      console.error('[confirmation] Failed to retrieve session:', err);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf6ee',
      color: '#2a2016',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=DM+Sans:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <PixelPurchase />
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>🎨</div>

        <h1 style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 'clamp(32px, 6vw, 54px)',
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: 12,
        }}>
          {petName ? `${petName}'s portrait is being crafted!` : 'Your portrait is being crafted!'}
        </h1>

        {email && (
          <p style={{ fontSize: 16, color: '#7a6a5a', lineHeight: 1.65, marginBottom: 8 }}>
            Check your inbox at <strong style={{ color: '#2a2016' }}>{email}</strong> within 24 hours.
          </p>
        )}

        <p style={{ fontSize: 14, color: '#8b7a6a', lineHeight: 1.65, marginBottom: 32 }}>
          Every portrait is individually crafted. If it lands in spam, check there too.
        </p>

        <div style={{
          background: '#f0eade',
          border: '2px solid #2a2016',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 32,
          boxShadow: '3px 3px 0 #2a2016',
        }}>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 6,
          }}>
            ✅ Guaranteed Next Day Delivery
          </div>
          <div style={{ fontSize: 13, color: '#8b7a6a', lineHeight: 1.6 }}>
            Your portrait will be in your inbox within 24 hours of ordering — or your money back.
            No exceptions.
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          fontSize: 13,
          color: '#8b7a6a',
          marginBottom: 32,
        }}>
          <span>🔒 Payment secured by Stripe</span>
          <span>·</span>
          <span>🎨 Individually crafted</span>
          <span>·</span>
          <span>📬 PDF delivered by email</span>
        </div>

        <Link href="/" style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 16,
          fontWeight: 700,
          color: '#8b7a6a',
          textDecoration: 'underline',
        }}>
          ← Order another portrait
        </Link>
      </div>
    </div>
  );
}
