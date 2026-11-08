'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { getStorage } from 'firebase/storage';
import { compileAndPublishCatalog, PublishResult } from '@/lib/publish-catalog';
import { usePendingChanges } from '@/lib/hooks/usePendingChanges';
import { markAllChangesAsPublished } from '@/lib/pending-changes';
import { useAdminAuth } from '@/context/admin-auth-context';
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
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sliders,
  FileText,
  Music,
  Calendar,
  Users,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChangeEntityType } from '@/types/admin';

function getEntityBadge(type: ChangeEntityType) {
  switch (type) {
    case 'markers':
      return {
        label: 'Markers',
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
        label: 'Hymn',
        icon: Music,
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800',
      };
    case 'season':
      return {
        label: 'Season',
        icon: Calendar,
        color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
      };
    case 'cantor':
      return {
        label: 'Cantor',
        icon: Users,
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
      };
    default:
      return {
        label: 'Change',
        icon: RefreshCw,
        color: 'bg-muted text-foreground border-border',
      };
  }
}

interface PublishModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function PublishModal({ open, onOpenChange, trigger }: PublishModalProps) {
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAdminAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const { pendingChanges, count, undoChange, undoingId } = usePendingChanges();

  const [isPublishing, setIsPublishing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [lastResult, setLastResult] = useState<PublishResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!firestore || !firebaseApp) {
      toast({
        title: 'Services unavailable',
        description: 'Firebase connection is not ready.',
        variant: 'destructive',
      });
      return;
    }

    const storage = getStorage(firebaseApp);
    setIsPublishing(true);
    setErrorMsg(null);

    try {
      const result = await compileAndPublishCatalog(firestore, storage, (msg) => {
        setProgressMsg(msg);
      });

      // Mark all pending changes as published in Firestore
      await markAllChangesAsPublished(firestore, user?.email || undefined);

      setLastResult(result);
      toast({
        title: 'Catalog Published Successfully',
        description: `Exported ${result.counts.hymns} hymns and ${result.counts.recordings} recordings to CDN (${result.fileSizeKb} KB).`,
      });
    } catch (err: any) {
      console.error('Publishing failed:', err);
      setErrorMsg(err.message || 'Failed to publish catalog.');
      toast({
        title: 'Publish Failed',
        description: err.message || 'An error occurred during snapshot compilation.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Publish to CDN</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-headline flex items-center gap-2">
                <span>Publish Catalog to CDN</span>
                {count > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 text-xs font-semibold">
                    {count} pending
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review pending changes and deploy live to the CantorHymns mobile app (TestFlight) & web players.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Review of Changes Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {count > 0 ? `Changes to be Published (${count})` : 'Staging Status'}
              </h4>
              {count > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  You can undo changes before deploying
                </span>
              )}
            </div>

            {count === 0 ? (
              <div className="rounded-lg bg-emerald-500/10 p-3.5 border border-emerald-500/20 text-xs text-muted-foreground flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Cloud Firestore is Live & Up-to-Date</p>
                  <p className="text-[11px] pt-0.5">
                    Clicking <strong>Publish Catalog to CDN</strong> below will compile all latest markers, lyrics, hymns, and seasons from Cloud Firestore into the production bundle for the mobile app (TestFlight) & web players.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingChanges.map(change => {
                  const badge = getEntityBadge(change.entityType);
                  const Icon = badge.icon;
                  const isUndoing = undoingId === change.id;

                  return (
                    <div
                      key={change.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 border gap-1 font-medium ${badge.color}`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            <span>{badge.label}</span>
                          </Badge>
                          <span className="font-semibold text-foreground truncate">
                            {change.entityName}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate">{change.summary}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-2.5 h-2.5" />
                            <span>{change.userEmail || 'Editor'}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUndoing || isPublishing}
                        onClick={() => undoChange(change.id)}
                        className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1 px-2"
                        title="Revert back to state before this edit"
                      >
                        {isUndoing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Progress / Status Indicator */}
          {isPublishing && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                {progressMsg}
              </p>
            </div>
          )}

          {lastResult && !isPublishing && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Published Successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                <div>Hymns: <span className="font-medium text-foreground">{lastResult.counts.hymns}</span></div>
                <div>Recordings: <span className="font-medium text-foreground">{lastResult.counts.recordings}</span></div>
                <div>Cantors: <span className="font-medium text-foreground">{lastResult.counts.cantors}</span></div>
                <div>Seasons: <span className="font-medium text-foreground">{lastResult.counts.genres}</span></div>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                Snapshot Size: <span className="font-mono">{lastResult.fileSizeKb} KB</span> &bull; {new Date(lastResult.generatedAt).toLocaleTimeString()}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isPublishing}
          >
            Close
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>{count > 0 ? `Publish ${count} Change${count > 1 ? 's' : ''} to CDN` : 'Publish Catalog to CDN'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
