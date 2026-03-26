"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { readTenantUserWithFallback, tenantUserRef } from "@/lib/tenant-user-client";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isModerator: boolean;
    userData: UserData | null;
}

interface UserData {
    role?: string;
    username?: string;
    favoriteGame?: string;
    hasCompletedOnboarding?: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, isModerator: false, userData: null });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModerator, setIsModerator] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            // Unsubscribe from previous user doc if exists
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
                unsubscribeUserDoc = null;
            }

            if (currentUser) {
                setLoading(true);
                (async () => {
                    try {
                        const resolved = await readTenantUserWithFallback(db, currentUser.uid);
                        const resolvedData = resolved.snapshot.exists() ? (resolved.snapshot.data() as UserData) : null;
                        if (resolvedData) {
                            setUserData(resolvedData);
                            setIsAdmin(resolvedData.role === "admin");
                            setIsModerator(resolvedData.role === "moderator" || resolvedData.role === "admin");
                        } else {
                            setUserData({ hasCompletedOnboarding: false });
                            setIsAdmin(false);
                            setIsModerator(false);
                        }

                        unsubscribeUserDoc = onSnapshot(
                            tenantUserRef(db, currentUser.uid),
                            (docSnap) => {
                                if (docSnap.exists()) {
                                    const data = docSnap.data() as UserData;
                                    setUserData(data);
                                    setIsAdmin(data.role === "admin");
                                    setIsModerator(data.role === "moderator" || data.role === "admin");
                                } else {
                                    setUserData({ hasCompletedOnboarding: false });
                                    setIsAdmin(false);
                                    setIsModerator(false);
                                }
                                setLoading(false);
                            },
                            (error) => {
                                console.error("Error fetching user data:", error);
                                setUserData(null);
                                setIsAdmin(false);
                                setIsModerator(false);
                                setLoading(false);
                            }
                        );
                    } catch (error) {
                        console.error("Error resolving tenant user data:", error);
                        setUserData(null);
                        setIsAdmin(false);
                        setIsModerator(false);
                        setLoading(false);
                    }
                })();
            } else {
                setUserData(null);
                setIsAdmin(false);
                setIsModerator(false);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isModerator, userData }}>
            {children}
        </AuthContext.Provider>
    );
}
