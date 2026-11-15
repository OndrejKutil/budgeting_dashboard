import { useEffect } from 'react';
import { healthApi } from '@/lib/api/endpoints';
import { PublicLayout } from '@/components/public/PublicLayout';
import { MonthHero } from './landing/MonthHero';
import { AverageSection } from './landing/AverageSection';
import { Inside } from './landing/Inside';

export default function LandingPage() {
  // Wake the backend while the visitor reads, so the first sign-in is not a cold start.
  useEffect(() => {
    healthApi.check().catch(() => {
      // Warm-up only.
    });
  }, []);

  return (
    <PublicLayout>
      <MonthHero />
      <AverageSection />
      <Inside />
    </PublicLayout>
  );
}
