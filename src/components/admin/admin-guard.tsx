'use client';

import React, { useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ShieldCheck, LogIn, LogOut, Loader2, KeyRound } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthorized, isLoading, loginWithGoogle, loginWithRedirect, logout } = useAdminAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup window without completing sign-in
        setAuthError(null);
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Google Sign-In is not enabled yet in your Firebase Console. Go to Authentication > Sign-in method in Firebase Console to turn on Google.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups or use Page Redirect below.');
      } else {
        console.error('Sign-in error:', err);
        setAuthError(err.message || `Sign in failed (${err.code || 'unknown error'})`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRedirectLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      await loginWithRedirect();
    } catch (err: any) {
      console.error('Redirect sign-in error:', err);
      setAuthError(err.message || 'Redirect sign-in failed');
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Verifying Developer Authorization...
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Checking permissions with Cloud Firestore
        </p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
              <KeyRound className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-headline tracking-tight">
              CantorHymns Studio
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Developer & Content Management Portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted/60 p-4 text-xs text-muted-foreground space-y-1.5 border">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Restricted Access</span>
              </div>
              <p>
                This portal provides direct management over Cloud Firestore collections, waveform markers, lyrics synchronization, and CDN publishing.
              </p>
            </div>

            {authError && (
              <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30">
                {authError}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2 flex flex-col gap-2.5">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full gap-2 h-11 text-sm font-medium"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in with Google
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleRedirectLogin}
              disabled={isLoggingIn}
              className="text-[11px] text-muted-foreground hover:text-foreground underline transition-colors text-center"
            >
              Having issues with popups? Sign in with page redirect
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Signed in but not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg shadow-xl border-destructive/30">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-headline tracking-tight text-destructive">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              You are signed in as <span className="font-semibold text-foreground">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              This account does not have administrator or editor permissions to modify CantorHymns database collections.
            </p>
            <div className="text-xs bg-muted/60 p-3 rounded-lg border text-muted-foreground text-left">
              <span className="font-semibold text-foreground block mb-1">Need access?</span>
              Contact the project administrator to add your email to the authorized developers list.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => logout()}
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out / Switch Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Authorized!
  return <>{children}</>;
}
