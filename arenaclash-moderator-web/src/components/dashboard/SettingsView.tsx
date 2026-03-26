"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { User, Mail, Save, Camera } from "lucide-react";
import { updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { tenantUserRef } from "@/lib/tenant-user-client";
import gsap from "gsap";
import { GsapLoaderInline } from "@/components/ui/GsapLoader";
import usePageReveal from "@/hooks/usePageReveal";

export default function SettingsView() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Standardized page reveal
    const containerRef = usePageReveal<HTMLDivElement>();

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setEmail(user.email || "");
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Update Auth Profile
            if (user.displayName !== displayName) {
                await updateProfile(user, { displayName });
            }

            // Update Firestore Document
            const userRef = tenantUserRef(db, user.uid);
            await updateDoc(userRef, {
                displayName,
                email // just in case
            });

            alert("Profile updated successfully!");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile: " + error.message);
        }
        setIsSaving(false);
    };

    if (!user) return <div className="p-8 text-center text-muted-foreground">Please login to view settings.</div>;

    return (
        <div ref={containerRef} className="space-y-6 max-w-2xl mx-auto pb-24 lg:pb-0">
            <h2 className="text-3xl font-bold font-rajdhani text-white mb-8">Profile Settings</h2>

            <div className="p-8 rounded-2xl bg-card border border-border shadow-xl relative overflow-hidden">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer">
                        <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center text-primary border-2 border-primary/50 overflow-hidden">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <User size={40} />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm">Tap to change avatar (Coming Soon)</p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User size={16} /> Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="Enter your username"
                        />
                    </div>

                    <div className="space-y-2 opacity-50 cursor-not-allowed">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Mail size={16} /> Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-muted-foreground focus:outline-none cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed currently.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-primary text-black font-bold py-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-8 shadow-lg shadow-primary/20"
                    >
                        {isSaving ? <GsapLoaderInline size="md" /> : <Save size={20} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
