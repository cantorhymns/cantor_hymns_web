'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { getStorage } from 'firebase/storage';
import { compileAndPublishCatalog, PublishResult } from '@/lib/publish-catalog';
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
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PublishModal() {
  const { firestore, firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
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
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm gap-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Publish to CDN</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
            <UploadCloud className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-headline">Publish Catalog to CDN</DialogTitle>
          <DialogDescription className="text-sm">
            Deploy your database changes live to all mobile app (TestFlight) and public web users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/60 p-3.5 border text-xs text-muted-foreground space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Zero-Downtime CDN Snapshot</span>
            </div>
            <p>
              This compiles all current Cantors, Liturgical Seasons, Hymns, Lyrics, and Waveform Markers from Cloud Firestore into an optimized snapshot uploaded to Firebase Storage (<code>data/catalog.json</code>).
            </p>
          </div>

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

        <DialogFooter className="gap-2 sm:gap-0">
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
                Publishing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Publish Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
