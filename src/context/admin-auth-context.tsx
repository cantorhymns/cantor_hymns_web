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
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
  canEdit: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// 👑 Primary immutable project creators (cannot be locked out)
export const PRIMARY_OWNER_EMAILS = [
  'cantorhymns@gmail.com',
  'andrewekladious@gmail.com',
];

// Baseline initial team members (can be updated or revoked anytime on the Admin page)
export const INITIAL_TEAM_ROLES: Record<string, UserRole> = {
  'pierrek3419@gmail.com': 'editor',
  'vmsazoom@gmail.com': 'editor',
};

// Compatibility aliases
export const ROOT_OWNER_EMAILS = [...PRIMARY_OWNER_EMAILS];
export const ROOT_EDITOR_EMAILS = ['vmsazoom@gmail.com', 'pierrek3419@gmail.com'];
export const ROOT_ADMIN_EMAILS = ROOT_OWNER_EMAILS;

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

      // 1. Primary repository owners can NEVER be locked out
      if (PRIMARY_OWNER_EMAILS.some(e => e.toLowerCase() === email)) {
        if (!isCancelled) {
          setRole('owner');
          setIsCheckingAuthDoc(false);
        }
        return;
      }

      // 2. Check live Firestore records (any change made on the Admin page takes priority!)
      if (firestore) {
        try {
          setIsCheckingAuthDoc(true);

          // Check direct authorized_users collection
          const emailDocRef = doc(firestore, 'authorized_users', email);
          const emailSnap = await getDoc(emailDocRef);

          if (emailSnap.exists()) {
            const data = emailSnap.data() as AuthorizedUser;
            if (data.role) {
              if (!isCancelled) {
                setRole(data.role === 'revoked' ? null : (data.role as UserRole));
                setIsCheckingAuthDoc(false);
              }
              return;
            }
          }

          // Check synced app_settings doc
          const settingsRef = doc(firestore, 'genres', 'app_settings');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const list: AuthorizedUser[] = settingsSnap.data()?.collaborators || [];
            const match = list.find(u => u.email && u.email.toLowerCase() === email);
            if (match && match.role) {
              if (!isCancelled) {
                setRole(match.role === 'revoked' ? null : (match.role as UserRole));
                setIsCheckingAuthDoc(false);
              }
              return;
            }
          }
        } catch (err) {
          console.warn('Note checking live firestore roles:', err);
        }
      }

      // 3. Fallback to baseline initial team roles if not yet customized in Firestore
      if (INITIAL_TEAM_ROLES[email]) {
        if (!isCancelled) {
          setRole(INITIAL_TEAM_ROLES[email]);
          setIsCheckingAuthDoc(false);
        }
        return;
      }

      // Not authorized
      if (!isCancelled) {
        setRole(null);
        setIsCheckingAuthDoc(false);
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

  const isOwner = useMemo(() => {
    return role === 'owner' || role === 'admin';
  }, [role]);

  const isAdmin = isOwner;

  const isEditor = useMemo(() => {
    return role === 'editor';
  }, [role]);

  const isViewer = useMemo(() => {
    return role === 'viewer';
  }, [role]);

  const canEdit = useMemo(() => {
    return isOwner || isEditor;
  }, [isOwner, isEditor]);

  const isAuthorized = useMemo(() => {
    return isOwner || isEditor || isViewer;
  }, [isOwner, isEditor, isViewer]);

  const isLoading = isUserLoading || isCheckingAuthDoc;

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthorized,
      isAdmin,
      isOwner,
      isEditor,
      isViewer,
      canEdit,
      isLoading,
      loginWithGoogle,
      loginWithRedirect,
      logout,
    }),
    [user, role, isAuthorized, isAdmin, isOwner, isEditor, isViewer, canEdit, isLoading]
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
