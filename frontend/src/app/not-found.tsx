'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function NotFound() {
  const { language } = useTranslation();
  const isBn = language === 'bn';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="settings-panel text-center py-8">
        <h2 className="text-xl font-bold text-[var(--text)] mb-2" suppressHydrationWarning>
          {isBn ? 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি' : 'Page Not Found'}
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-6" suppressHydrationWarning>
          {isBn
            ? 'আপনার অনুরোধকৃত ভিউ বা লিঙ্কটি খুঁজে পাওয়া যায়নি।'
            : 'The requested view or resource could not be found.'}
        </p>
        <Link href="/dashboard" className="settings-action-btn" suppressHydrationWarning>
          {isBn ? 'অ্যাসিস্ট্যান্টে ফিরুন' : 'Return to Assistant'}
        </Link>
      </div>
    </div>
  );
}
