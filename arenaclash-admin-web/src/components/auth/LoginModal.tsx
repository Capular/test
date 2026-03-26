"use client";

import { useState } from "react";
import { X, Mail, LogIn } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { readTenantUserWithFallback, upsertTenantUser } from "@/lib/tenant-user-client";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const modalRef = useRef(null);

    useGSAP(() => {
        if (isOpen) {
            gsap.fromTo(modalRef.current, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists
            const existing = await readTenantUserWithFallback(db, user.uid);

            if (existing.source === "none") {
                // New User: Create full profile with default role
                await upsertTenantUser(db, user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: 'user',
                    walletBalance: 0,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    migratedFromLegacy: false,
                });
            } else {
                // Existing User: Update only metadata, prevent role overwrite
                await upsertTenantUser(db, user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    lastLogin: new Date().toISOString(),
                    lastSeenAt: serverTimestamp(),
                });
            }

            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                // Update last login
                await upsertTenantUser(db, userCredential.user.uid, {
                    lastLogin: new Date().toISOString()
                });
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });

                // Create user in Firestore
                await upsertTenantUser(db, userCredential.user.uid, {
                    email: email,
                    displayName: name,
                    role: 'user',
                    walletBalance: 0,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    migratedFromLegacy: false,
                });
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div ref={modalRef} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 relative shadow-2xl shadow-primary/10">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold font-rajdhani text-white mb-2">
                    {isLogin ? "Welcome Back" : "Join the Arena"}
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                    {isLogin ? "Login to access your wallet and tournaments." : "Create an account to start battling."}
                </p>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">{error}</div>}

                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-neutral-200 transition-colors mb-4"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                className="w-full bg-black/20 border border-border rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                                placeholder="ProGamer123"
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-muted-foreground h-5 w-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-black/20 border border-border rounded-xl p-3 pl-10 text-white focus:border-primary focus:outline-none transition-colors"
                                placeholder="name@example.com"
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
                            className="w-full bg-black/20 border border-border rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                        <LogIn size={18} />
                        {isLogin ? "Login" : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-bold">
                        {isLogin ? "Sign up" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
}
