'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useFirebase } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AuthorizedUser, UserRole } from '@/types/admin';

interface AdminAuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthorized: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ROOT_ADMIN_EMAILS = ['cantorhymns@gmail.com', 'andrewekladious@gmail.com'];

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isCheckingAuthDoc, setIsCheckingAuthDoc] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function checkAuthorization() {
      if (isUserLoading) {
        return;
      }

      if (!user || !user.email) {
        if (!isCancelled) {
          setRole(null);
          setIsCheckingAuthDoc(false);
        }
        return;
      }

      const email = user.email.toLowerCase();

      // Owner accounts have full admin permissions
      if (ROOT_ADMIN_EMAILS.some(e => e.toLowerCase() === email)) {
        if (!isCancelled) {
          setRole('admin');
          setIsCheckingAuthDoc(false);
        }
        return;
      }

      // Check authorized_users collection for collaborators
      if (!firestore) {
        if (!isCancelled) {
          setRole(null);
          setIsCheckingAuthDoc(false);
        }
        return;
      }

      try {
        setIsCheckingAuthDoc(true);
        const emailDocRef = doc(firestore, 'authorized_users', email);
        const emailSnap = await getDoc(emailDocRef);

        if (emailSnap.exists()) {
          const data = emailSnap.data() as AuthorizedUser;
          if (!isCancelled) {
            setRole(data.role || 'editor');
            setIsCheckingAuthDoc(false);
          }
          return;
        }

        const uidDocRef = doc(firestore, 'authorized_users', user.uid);
        const uidSnap = await getDoc(uidDocRef);

        if (uidSnap.exists()) {
          const data = uidSnap.data() as AuthorizedUser;
          if (!isCancelled) {
            setRole(data.role || 'editor');
            setIsCheckingAuthDoc(false);
          }
          return;
        }

        // Not authorized
        if (!isCancelled) {
          setRole(null);
          setIsCheckingAuthDoc(false);
        }
      } catch (err) {
        console.error('Error verifying admin authorization:', err);
        if (!isCancelled) {
          setRole(null);
          setIsCheckingAuthDoc(false);
        }
      }
    }

    checkAuthorization();

    return () => {
      isCancelled = true;
    };
  }, [user, isUserLoading, firestore]);

  useEffect(() => {
    if (auth) {
      getRedirectResult(auth).catch(err => {
        console.error('Redirect sign-in error:', err);
      });
    }
  }, [auth]);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized.');
    const provider = new GoogleAuthProvider();
    // Forces Google to ALWAYS display the account selection screen
    provider.setCustomParameters({
      prompt: 'select_account consent',
    });
    await signInWithPopup(auth, provider);
  };

  const loginWithRedirect = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account consent',
    });
    await signInWithRedirect(auth, provider);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const isAuthorized = useMemo(() => {
    return role === 'admin' || role === 'editor';
  }, [role]);

  const isAdmin = useMemo(() => {
    return role === 'admin';
  }, [role]);

  const isEditor = useMemo(() => {
    return role === 'editor';
  }, [role]);

  const isLoading = isUserLoading || isCheckingAuthDoc;

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthorized,
      isAdmin,
      isEditor,
      isLoading,
      loginWithGoogle,
      loginWithRedirect,
      logout,
    }),
    [user, role, isAuthorized, isAdmin, isEditor, isLoading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
