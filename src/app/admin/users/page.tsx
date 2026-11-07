'use client';

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase';
import { useAdminAuth } from '@/context/admin-auth-context';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
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
import { UserCheck, Plus, Trash2, Shield, Loader2, KeyRound } from 'lucide-react';

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const { user: currentUser, isAdmin } = useAdminAuth();
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
        const snap = await getDocs(collection(firestore, 'authorized_users'));
        const list = snap.docs.map(d => ({
          email: d.id,
          ...d.data(),
        } as AuthorizedUser));
        setUsers(list);
      } catch (err) {
        console.error('Failed to load authorized users:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, [firestore]);

  const handleAddUser = async () => {
    if (!firestore || !newEmail.trim()) return;

    const email = newEmail.trim().toLowerCase();

    try {
      setIsSubmitting(true);
      const userRef = doc(firestore, 'authorized_users', email);

      const payload: AuthorizedUser = {
        email,
        role: newRole,
        addedBy: currentUser?.email || 'admin',
      };

      await setDoc(userRef, {
        ...payload,
        addedAt: serverTimestamp(),
      });

      setUsers(prev => [...prev.filter(u => u.email !== email), payload]);
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

  const ROOT_ADMIN_EMAILS = ['cantorhymns@gmail.com', 'andrewekladious@gmail.com'];

  const handleRemoveUser = async (email: string) => {
    if (!firestore) return;

    if (ROOT_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())) {
      toast({
        title: 'Cannot Remove Primary Owner',
        description: `${email} is a primary project owner.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const userRef = doc(firestore, 'authorized_users', email.toLowerCase());
      await deleteDoc(userRef);

      setUsers(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            <span>Team & Permissions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage authorized developers and editors permitted to modify database collections
          </p>
        </div>

        {isAdmin && (
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
                  Grant database edit permissions to another Google account.
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
                      <SelectItem value="editor" className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold">Editor</div>
                          <div className="text-[10px] text-muted-foreground">
                            Can edit hymns, lyrics, markers, and audio alignments.
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold">Admin</div>
                          <div className="text-[10px] text-muted-foreground">
                            Full access, including team management and CDN publishing.
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
        )}
      </div>

      {/* Project Owners Notice */}
      <div className="p-4 rounded-xl border bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">
              Project Owners: <span className="font-mono">andrewekladious@gmail.com</span> &bull; <span className="font-mono">cantorhymns@gmail.com</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Repository owner accounts with permanent access across all collections and publishing controls.
            </div>
          </div>
        </div>
        <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
          Owners
        </Badge>
      </div>

      {/* Users Table */}
      <Card className="shadow-sm">
        <CardHeader className="py-4 px-6 border-b">
          <CardTitle className="text-base font-semibold">Authorized Collaborators</CardTitle>
          <CardDescription className="text-xs">
            Users listed here can log into Cantor Studio and modify live database records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {users.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No additional collaborators added yet. Click &quot;Add Collaborator&quot; above to grant access.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Granted By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(u => (
                  <tr key={u.email} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px] uppercase font-semibold"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {u.addedBy || 'admin'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && !ROOT_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase()) && (
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
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
