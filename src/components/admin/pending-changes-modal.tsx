'use client';

import React, { useState } from 'react';
import { usePendingChanges } from '@/lib/hooks/usePendingChanges';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Music,
  FileText,
  Calendar,
  Users,
  Sliders,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ChangeEntityType } from '@/types/admin';

function getEntityBadge(type: ChangeEntityType) {
  switch (type) {
    case 'markers':
      return {
        label: 'Waveform Markers',
        icon: Sliders,
        color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
      };
    case 'lyrics':
      return {
        label: 'Lyrics',
        icon: FileText,
        color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
      };
    case 'hymn':
      return {
        label: 'Hymn Metadata',
        icon: Music,
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800',
      };
    case 'season':
      return {
        label: 'Season Order',
        icon: Calendar,
        color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
      };
    case 'cantor':
      return {
        label: 'Cantor Profile',
        icon: Users,
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
      };
    default:
      return {
        label: 'Change',
        icon: History,
        color: 'bg-muted text-foreground border-border',
      };
  }
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface PendingChangesModalProps {
  onOpenPublish?: () => void;
}

export function PendingChangesModal({ onOpenPublish }: PendingChangesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { pendingChanges, count, loading, undoChange, undoingId } = usePendingChanges();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={count > 0 ? 'secondary' : 'ghost'}
          size="sm"
          className={`h-8 text-xs font-medium gap-1.5 transition-all ${
            count > 0
              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={
            count > 0
              ? `${count} unpublished change${count > 1 ? 's' : ''} saved to cloud`
              : 'All changes are published'
          }
        >
          {count > 0 ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          )}

          <span className="hidden sm:inline">
            {count > 0 ? `${count} Unpublished` : 'Changes Synced'}
          </span>
          <span className="sm:hidden">{count > 0 ? count : ''}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-headline flex items-center gap-2">
                <span>Unpublished Changes</span>
                {count > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 text-xs font-semibold">
                    {count} pending
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Changes saved to Cloud Firestore that have not yet been deployed to the CDN.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading pending changes...</p>
            </div>
          ) : count === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">All Changes Published</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Your live CDN catalog is 100% in sync with Cloud Firestore. When you save updates in Waveform Studio, Hymns, or Seasons, they will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingChanges.map(change => {
                const badge = getEntityBadge(change.entityType);
                const Icon = badge.icon;
                const isUndoingThis = undoingId === change.id;

                return (
                  <div
                    key={change.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 border gap-1 font-medium ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </Badge>
                        <span className="font-semibold text-sm text-foreground truncate">
                          {change.entityName}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {change.summary}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{change.userEmail || 'Editor'}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(change.timestamp)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUndoingThis}
                        onClick={() => undoChange(change.id)}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                        title="Revert back to the snapshot before this edit"
                      >
                        {isUndoingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Undoing...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Undo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {count > 0 ? `${count} change${count > 1 ? 's' : ''} pending review` : 'Synced with CDN'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {onOpenPublish && count > 0 && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                onClick={() => {
                  setIsOpen(false);
                  onOpenPublish();
                }}
              >
                <span>Publish to CDN</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
