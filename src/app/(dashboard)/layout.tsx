'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // pathname에서 accountId 추출
  const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
  const accountId = accountMatch?.[1];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="md:pl-64">
        <Header accountId={accountId} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
