'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { useAdminAuth } from '@/context/admin-auth-context';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthorizedUser, UserRole } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Plus, Trash2, ShieldAlert, Loader2, Lock, CheckCircle2 } from 'lucide-react';

const PRIMARY_OWNER_EMAILS = [
  'cantorhymns@gmail.com',
  'andrewekladious@gmail.com',
];

const INITIAL_TEAM: AuthorizedUser[] = [
  { email: 'pierrek3419@gmail.com', role: 'editor', addedBy: 'initial' },
  { email: 'vmsazoom@gmail.com', role: 'editor', addedBy: 'initial' },
];

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const { user: currentUser, isOwner, isLoading: isAuthLoading } = useAdminAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);

  // Add Collaborator Modal
  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      if (!firestore) return;
      try {
        setIsLoading(true);
        const userMap = new Map<string, AuthorizedUser>();

        // Always register the 2 Primary Immutable Owners
        PRIMARY_OWNER_EMAILS.forEach(email => {
          userMap.set(email.toLowerCase(), {
            email: email.toLowerCase(),
            role: 'owner',
            addedBy: 'Platform Creator',
          });
        });

        // 1. Try loading from authorized_users collection
        try {
          const snap = await getDocs(collection(firestore, 'authorized_users'));
          snap.docs.forEach(d => {
            const data = d.data();
            const email = d.id.toLowerCase();
            // Don't overwrite primary owners' immutable status
            if (!PRIMARY_OWNER_EMAILS.includes(email)) {
              userMap.set(email, {
                email,
                role: (data.role as UserRole) || 'editor',
                addedBy: data.addedBy || 'admin',
                addedAt: data.addedAt,
              });
            }
          });
        } catch (err) {
          console.warn('Note: authorized_users collection check:', err);
        }

        // 2. Also load from synced app settings document
        try {
          const settingsRef = doc(firestore, 'genres', 'app_settings');
          const snap = await getDoc(settingsRef);
          if (snap.exists()) {
            const data = snap.data();
            const list: AuthorizedUser[] = data.collaborators || [];
            list.forEach(u => {
              if (u.email) {
                const email = u.email.toLowerCase();
                if (!PRIMARY_OWNER_EMAILS.includes(email)) {
                  userMap.set(email, u);
                }
              }
            });
          }
        } catch (err) {
          console.warn('Note: app_settings check:', err);
        }

        // 3. Fallback baseline members if not yet in database
        INITIAL_TEAM.forEach(member => {
          const email = member.email.toLowerCase();
          if (!userMap.has(email)) {
            userMap.set(email, member);
          }
        });

        // Exclude anyone marked as revoked
        const activeUsers = Array.from(userMap.values()).filter(
          u => (u.role as string) !== 'revoked'
        );

        // Sort: Primary Owners first, then alphabetical by email
        activeUsers.sort((a, b) => {
          const aPrimary = PRIMARY_OWNER_EMAILS.includes(a.email.toLowerCase());
          const bPrimary = PRIMARY_OWNER_EMAILS.includes(b.email.toLowerCase());
          if (aPrimary && !bPrimary) return -1;
          if (!aPrimary && bPrimary) return 1;
          return a.email.localeCompare(b.email);
        });

        setUsers(activeUsers);
      } catch (err) {
        console.error('Failed to load authorized users:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isOwner) {
      loadUsers();
    }
  }, [firestore, isOwner]);

  // Handle in-line role change from the table dropdown
  const handleUpdateRole = async (targetEmail: string, role: UserRole) => {
    if (!firestore || !isOwner) return;

    const email = targetEmail.toLowerCase();
    if (PRIMARY_OWNER_EMAILS.includes(email)) {
      toast({
        title: 'Action Prohibited',
        description: `${email} is a primary owner and cannot be changed.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Optimistically update UI
      setUsers(prev =>
        prev.map(u => (u.email.toLowerCase() === email ? { ...u, role } : u))
      );

      const payload: AuthorizedUser = {
        email,
        role,
        addedBy: currentUser?.email || 'admin',
      };

      let writeSuccess = false;
      let writeError: any = null;

      // 1. Synced settings doc in genres (guaranteed permissions for all admins)
      try {
        const settingsRef = doc(firestore, 'genres', 'app_settings');
        const snap = await getDoc(settingsRef);
        const existing: AuthorizedUser[] = snap.exists() ? snap.data()?.collaborators || [] : [];
        const updated = [
          ...existing.filter(u => u.email.toLowerCase() !== email),
          { ...payload, addedAt: new Date().toISOString() },
        ];
        await setDoc(settingsRef, { collaborators: updated }, { merge: true });
        writeSuccess = true;
      } catch (e: any) {
        console.warn('genres/app_settings role update error:', e);
        writeError = e;
      }

      // 2. Direct authorized_users doc
      try {
        const userRef = doc(firestore, 'authorized_users', email);
        await setDoc(userRef, { ...payload, addedAt: serverTimestamp() }, { merge: true });
        writeSuccess = true;
      } catch (e: any) {
        console.warn('authorized_users role update note:', e);
        if (!writeError) writeError = e;
      }

      if (!writeSuccess) {
        throw new Error(writeError?.message || 'Failed to save updated role to database.');
      }

      toast({
        title: 'Role Updated',
        description: `Updated ${email} to ${role.toUpperCase()}.`,
      });
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update collaborator role.',
        variant: 'destructive',
      });
    }
  };

  // Add new user via modal
  const handleAddUser = async () => {
    if (!firestore || !newEmail.trim() || !isOwner) return;

    const email = newEmail.trim().toLowerCase();

    try {
      setIsSubmitting(true);

      const payload: AuthorizedUser = {
        email,
        role: newRole,
        addedBy: currentUser?.email || 'admin',
      };

      // 1. Attempt write to standard authorized_users collection
      try {
        const userRef = doc(firestore, 'authorized_users', email);
        await setDoc(userRef, {
          ...payload,
          addedAt: serverTimestamp(),
        });
      } catch (e: any) {
        console.warn('Direct authorized_users write note:', e.message);
      }

      // 2. Also save to synced settings doc (guaranteed permissions under genres rules)
      try {
        const settingsRef = doc(firestore, 'genres', 'app_settings');
        const snap = await getDoc(settingsRef);
        const existing: AuthorizedUser[] = snap.exists() ? snap.data()?.collaborators || [] : [];
        const updated = [
          ...existing.filter(u => u.email.toLowerCase() !== email),
          { ...payload, addedAt: new Date().toISOString() },
        ];
        await setDoc(settingsRef, { collaborators: updated }, { merge: true });
      } catch (e: any) {
        console.warn('Synced settings write note:', e.message);
      }

      setUsers(prev => {
        const next = [...prev.filter(u => u.email.toLowerCase() !== email), payload];
        next.sort((a, b) => {
          const aPrimary = PRIMARY_OWNER_EMAILS.includes(a.email.toLowerCase());
          const bPrimary = PRIMARY_OWNER_EMAILS.includes(b.email.toLowerCase());
          if (aPrimary && !bPrimary) return -1;
          if (!aPrimary && bPrimary) return 1;
          return a.email.localeCompare(b.email);
        });
        return next;
      });

      setIsOpenAdd(false);
      setNewEmail('');
      setNewRole('editor');

      toast({
        title: 'Collaborator Added',
        description: `Granted ${newRole} permissions to ${email}.`,
      });
    } catch (err: any) {
      console.error('Failed to add collaborator:', err);
      toast({
        title: 'Failed to Add User',
        description: err.message || 'Could not grant developer permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke collaborator access
  const handleRemoveUser = async (email: string) => {
    if (!firestore || !isOwner) return;

    const targetEmail = email.toLowerCase();

    if (PRIMARY_OWNER_EMAILS.includes(targetEmail)) {
      toast({
        title: 'Cannot Remove Primary Owner',
        description: `${email} is a primary project creator and cannot be removed.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      // 1. Mark revoked in authorized_users
      try {
        const userRef = doc(firestore, 'authorized_users', targetEmail);
        await setDoc(userRef, { role: 'revoked', active: false }, { merge: true });
      } catch (e) {
        console.warn('authorized_users deletion note:', e);
      }

      // 2. Mark revoked in synced settings doc
      try {
        const settingsRef = doc(firestore, 'genres', 'app_settings');
        const snap = await getDoc(settingsRef);
        const existing: AuthorizedUser[] = snap.exists() ? snap.data()?.collaborators || [] : [];
        const updated = [
          ...existing.filter(u => u.email.toLowerCase() !== targetEmail),
          { email: targetEmail, role: 'revoked' as any, active: false },
        ];
        await setDoc(settingsRef, { collaborators: updated }, { merge: true });
      } catch (e) {
        console.warn('app_settings deletion note:', e);
      }

      setUsers(prev => prev.filter(u => u.email.toLowerCase() !== targetEmail));

      toast({
        title: 'Collaborator Removed',
        description: `Revoked access for ${email}.`,
      });
    } catch (err: any) {
      console.error('Failed to remove collaborator:', err);
      toast({
        title: 'Removal Failed',
        description: err.message || 'Could not delete user authorization document.',
        variant: 'destructive',
      });
    }
  };

  // Access Guard: If not an Owner, completely block and do not render any team HTML
  if (isAuthLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Verifying Owner Access...</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-headline tracking-tight text-foreground">
          Owner Permissions Required
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
          The Team & Permissions directory is strictly locked to project <span className="font-semibold text-foreground">Owners</span>.
          Your current account does not have access to view or manage team members.
        </p>
        <Button asChild size="sm" variant="outline" className="mt-6 gap-2 text-xs">
          <Link href="/admin">
            <span>Return to Studio Dashboard</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading Team & Permissions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            <span>Team & Permissions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage project owners, editors, and viewers with access to Cantor Studio
          </p>
        </div>

        <Dialog open={isOpenAdd} onOpenChange={setIsOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4" />
              <span>Add Collaborator</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-headline">Add Collaborator</DialogTitle>
              <DialogDescription className="text-xs">
                Grant Cantor Studio permissions to a Google account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Google Account Email</label>
                <Input
                  placeholder="e.g. deacon.john@gmail.com"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Role</label>
                <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner" className="text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>👑</span>
                          <span>Owner</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Full administrative access, team management, and CDN publishing.
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor" className="text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>✍️</span>
                          <span>Editor</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Can create and edit hymns, lyrics, waveform markers, and cantors.
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer" className="text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>👁️</span>
                          <span>Viewer</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Read-only access. Can review hymns, lyrics, and audio markers without modifying.
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpenAdd(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddUser}
                disabled={isSubmitting || !newEmail.trim()}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Grant Access</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unified Users Table */}
      <Card className="shadow-sm border">
        <CardHeader className="py-4 px-6 border-b bg-card">
          <CardTitle className="text-base font-semibold">Authorized Members</CardTitle>
          <CardDescription className="text-xs">
            All Google accounts authorized to log into Cantor Studio, with their live permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Member Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => {
                const isPrimary = PRIMARY_OWNER_EMAILS.includes(u.email.toLowerCase());

                return (
                  <tr key={u.email} className="hover:bg-muted/30 transition-colors">
                    {/* Email */}
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{u.email}</span>
                        {isPrimary && (
                          <Badge variant="outline" className="text-[9px] border-primary/40 text-primary font-semibold py-0 h-4">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Role / In-line Role Selector */}
                    <td className="py-3.5 px-4">
                      {isPrimary ? (
                        <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wide">
                          👑 Owner
                        </Badge>
                      ) : (
                        <Select
                          value={u.role === 'admin' ? 'owner' : u.role}
                          onValueChange={(val: UserRole) => handleUpdateRole(u.email, val)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner" className="text-xs">
                              👑 Owner
                            </SelectItem>
                            <SelectItem value="editor" className="text-xs">
                              ✍️ Editor
                            </SelectItem>
                            <SelectItem value="viewer" className="text-xs">
                              👁️ Viewer
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {isPrimary ? (
                        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <Lock className="w-3 h-3 text-primary/70" />
                          <span>Permanent</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isPrimary ? (
                        <span className="text-[11px] text-muted-foreground italic px-2">
                          Immutable
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveUser(u.email)}
                          className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
