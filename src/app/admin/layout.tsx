import React from 'react';
import { Metadata } from 'next';
import { AdminAuthProvider } from '@/context/admin-auth-context';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminNavbar } from '@/components/admin/admin-navbar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cantor Studio Admin',
  description: 'CantorHymns Database & Waveform Studio Management Portal',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AdminGuard>
          <AdminNavbar />
          <div className="flex-1">
            {children}
          </div>
        </AdminGuard>
      </div>
    </AdminAuthProvider>
  );
}
