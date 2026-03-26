"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tenantUsersCollectionPath } from "@/lib/tenant-context";
import { tenantUserRef } from "@/lib/tenant-user-client";
import { Search, UserCog, Wallet, Edit, X, Shield, PlayCircle, User } from "lucide-react";
import gsap from "gsap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserData {
    id: string;
    email: string;
    displayName?: string;
    role?: string;
    walletBalance?: number;
    isAdmin?: boolean;
    isModerator?: boolean;
}

type UserRole = 'user' | 'moderator' | 'admin';

const ROLES: { value: UserRole; label: string; icon: React.ReactNode; description: string; color: string }[] = [
    {
        value: 'user',
        label: 'User',
        icon: <User size={16} />,
        description: 'Standard user access',
        color: 'text-muted-foreground border-border'
    },
    {
        value: 'moderator',
        label: 'Moderator',
        icon: <PlayCircle size={16} />,
        description: 'Can host and manage matches',
        color: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10'
    },
    {
        value: 'admin',
        label: 'Admin',
        icon: <Shield size={16} />,
        description: 'Full system access',
        color: 'text-primary border-primary/50 bg-primary/10'
    },
];

export default function AdminUsers() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [editForm, setEditForm] = useState<{ displayName: string; role: UserRole; walletBalance: number }>({
        displayName: '',
        role: 'user',
        walletBalance: 0
    });
    const [saving, setSaving] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const fetchUsers = async () => {
        const q = query(collection(db, ...tenantUsersCollectionPath()), orderBy("email"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
        setUsers(data);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (listRef.current && users.length > 0) {
            gsap.fromTo(
                listRef.current.children,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [users]);

    const openEditDialog = (user: UserData) => {
        setEditingUser(user);
        setEditForm({
            displayName: user.displayName || '',
            role: (user.role as UserRole) || 'user',
            walletBalance: user.walletBalance || 0
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            await updateDoc(tenantUserRef(db, editingUser.id), {
                displayName: editForm.displayName,
                role: editForm.role,
                walletBalance: editForm.walletBalance,
                isAdmin: editForm.role === 'admin',
                isModerator: editForm.role === 'moderator' || editForm.role === 'admin'
            });
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user");
        }
        setSaving(false);
    };

    const getRoleBadge = (role?: string) => {
        const roleConfig = ROLES.find(r => r.value === role) || ROLES[0];
        return (
            <span className={`text-xs px-2 py-1 rounded-md font-medium border flex items-center gap-1.5 ${roleConfig.color}`}>
                {roleConfig.icon}
                {roleConfig.label}
            </span>
        );
    };

    const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:border-primary focus:outline-none transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div ref={listRef} className="space-y-2">
                {filtered.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg hover:border-border transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserCog className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground text-sm">{user.displayName || "User"}</h3>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground">Wallet</p>
                                <p className="text-sm font-medium">₹{user.walletBalance || 0}</p>
                            </div>
                            {getRoleBadge(user.role)}
                            <button
                                onClick={() => openEditDialog(user)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit User"
                            >
                                <Edit size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold font-rajdhani flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" />
                            Edit User
                        </DialogTitle>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-5">
                            {/* User Info Header */}
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <UserCog className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">{editingUser.displayName || "User"}</p>
                                    <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                                </div>
                            </div>

                            {/* Display Name */}
                            <div className="space-y-2">
                                <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                                <Input
                                    id="displayName"
                                    value={editForm.displayName}
                                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                    className="bg-muted/30 border-border/50"
                                    placeholder="Enter display name"
                                />
                            </div>

                            {/* Wallet Balance */}
                            <div className="space-y-2">
                                <Label htmlFor="walletBalance" className="text-sm font-medium flex items-center gap-2">
                                    <Wallet size={14} className="text-emerald-500" />
                                    Wallet Balance
                                </Label>
                                <Input
                                    id="walletBalance"
                                    type="number"
                                    value={editForm.walletBalance}
                                    onChange={(e) => setEditForm({ ...editForm, walletBalance: Number(e.target.value) })}
                                    className="bg-muted/30 border-border/50"
                                    placeholder="0"
                                />
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">User Role</Label>
                                <div className="grid gap-2">
                                    {ROLES.map((role) => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => setEditForm({ ...editForm, role: role.value })}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${editForm.role === role.value
                                                    ? role.color + ' ring-1 ring-offset-1 ring-offset-background'
                                                    : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editForm.role === role.value ? role.color : 'bg-muted/50'
                                                }`}>
                                                {role.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{role.label}</p>
                                                <p className="text-xs text-muted-foreground">{role.description}</p>
                                            </div>
                                            {editForm.role === role.value && (
                                                <div className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-current" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setEditingUser(null)}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-primary hover:bg-primary/90"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
