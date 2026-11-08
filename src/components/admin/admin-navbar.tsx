'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import { PublishModal } from './publish-modal';
import { PendingChangesModal } from './pending-changes-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Music2,
  Sliders,
  Users,
  Calendar,
  UserCheck,
  LogOut,
  ExternalLink,
  Shield,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/hymns', label: 'Hymns & Lyrics', icon: Music2 },
  { href: '/admin/markers', label: 'Waveform Studio', icon: Sliders },
  { href: '/admin/cantors', label: 'Cantors', icon: Users },
  { href: '/admin/seasons', label: 'Season & Hymns Order', icon: Calendar },
  { href: '/admin/users', label: 'Team', icon: UserCheck },
];

export function AdminNavbar() {
  const pathname = usePathname();
  const { user, role, isOwner, logout } = useAdminAuth();
  const [publishOpen, setPublishOpen] = React.useState(false);

  const authorizedNavLinks = React.useMemo(() => {
    return NAV_LINKS.filter(link => {
      if (link.href === '/admin/users') {
        return isOwner;
      }
      return true;
    });
  }, [isOwner]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 gap-4">
        {/* Brand / Logo */}
        <Link href="/admin" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-base tracking-tight text-foreground whitespace-nowrap">
                Cantor Studio
              </span>
              <Badge
                variant={
                  role === 'owner' || role === 'admin'
                    ? 'default'
                    : role === 'editor'
                    ? 'secondary'
                    : 'outline'
                }
                className="text-[10px] px-1.5 py-0 h-4 uppercase font-semibold tracking-wider shrink-0"
              >
                {role === 'admin' ? 'Owner' : role || 'Viewer'}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-none hidden sm:block whitespace-nowrap">
              Developer & Content Management
            </p>
          </div>
        </Link>

        {/* Navigation Links - Centered & Balanced */}
        <nav className="hidden md:flex items-center justify-center gap-1 flex-1 mx-2 lg:mx-4">
          {authorizedNavLinks.map(link => {
            const Icon = link.icon;
            const isActive =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <PendingChangesModal onOpenPublish={() => setPublishOpen(true)} />
          <PublishModal open={publishOpen} onOpenChange={setPublishOpen} />

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* User info & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden xl:inline-block max-w-[150px] truncate">
              {user?.email}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              title="Sign Out / Switch Account"
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs gap-1 hidden sm:flex shrink-0"
            >
              <Link href="/" target="_blank">
                <span>View App</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Nav */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t bg-muted/30 scrollbar-none">
        {authorizedNavLinks.map(link => {
          const Icon = link.icon;
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
