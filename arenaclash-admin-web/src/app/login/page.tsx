"use client";

import { useState, useRef, useEffect } from "react";
import { Mail, LogIn, ArrowRight, ShieldAlert } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { readTenantUserWithFallback } from "@/lib/tenant-user-client";

export default function AdminLoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Redirect if already logged in and is admin
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!loading && user) {
                // Double check role even if context says so, for safety on login page
                const resolved = await readTenantUserWithFallback(db, user.uid);
                const userData = resolved.snapshot.data();

                if (userData && userData.role === 'admin') {
                    router.replace("/admin");
                } else {
                    // Log out if they are logged in but not an admin
                    await signOut(auth);
                    setError("Access Denied: You do not have administrator privileges.");
                }
            }
        };
        checkAdminStatus();
    }, [user, loading, router]);

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(containerRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8 }
        )
            .fromTo(formRef.current,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.6 },
                "-=0.4"
            );
    }, []);

    const verifyAdminAndRedirect = async (uid: string) => {
        const resolved = await readTenantUserWithFallback(db, uid);
        const userSnap = resolved.snapshot;
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.role === 'admin') {
                router.replace("/admin");
            } else {
                throw new Error("Access Denied: Administrator privileges required.");
            }
        } else {
             throw new Error("User account not found.");
        }
    };

    const handleGoogleLogin = async () => {
        setError("");
        setAuthLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await verifyAdminAndRedirect(result.user.uid);
        } catch (err: any) {
            console.error("Login error:", err);
            // If verification failed, sign them out immediately
            if (auth.currentUser) await signOut(auth);
            setError(err.message || "An error occurred during login.");
            setAuthLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setAuthLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
             await verifyAdminAndRedirect(userCredential.user.uid);
        } catch (err: any) {
             console.error("Login error:", err);
             if (auth.currentUser) await signOut(auth);
            setError(err.message || "Invalid credentials or access denied.");
            setAuthLoading(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects - Red Tint for Admin */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div ref={containerRef} className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-red-500/20 rounded-2xl mb-4 ring-1 ring-red-500/40">
                         <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-4xl font-bold font-rajdhani text-white mb-2 tracking-wide">Admin Portal</h1>
                    <p className="text-muted-foreground">Restricted Access Only</p>
                </div>

                <div ref={formRef} className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    {/* Glow Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

                    <h2 className="text-2xl font-bold font-rajdhani text-white mb-2">
                        Authenticate
                    </h2>
                    <p className="text-muted-foreground text-sm mb-6">
                        Login with your administrator credentials.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors mb-6 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {authLoading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Admin Login with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or with credentials</span></div>
                    </div>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-muted-foreground h-5 w-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={authLoading}
                                    className="w-full bg-black/20 border border-border rounded-xl p-3 pl-10 text-white focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                                    placeholder="admin@arenaclash.gg"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={authLoading}
                                className="w-full bg-black/20 border border-border rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {authLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                                    Access Dashboard
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
