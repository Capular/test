"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ShieldCheck, Smartphone } from "lucide-react";
import gsap from "gsap";

import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import GsapLoader from "@/components/ui/GsapLoader";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    uid: string;
}

export default function PaymentModal({ isOpen, onClose, uid }: PaymentModalProps) {
    const router = useRouter();
    const [amount, setAmount] = useState("100");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [upiIntent, setUpiIntent] = useState("");
    const [activeOrderId, setActiveOrderId] = useState("");
    const [autoCheckUrl, setAutoCheckUrl] = useState("");
    const [polling, setPolling] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setUpiIntent("");
            setActiveOrderId("");
            setAutoCheckUrl("");
            setPolling(false);
            setTimeLeft(300);
            setError("");
            setLoading(false);
        }
    }, [isOpen]);

    // GSAP entrance animation
    useEffect(() => {
        if (isOpen) {
            if (overlayRef.current) gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
            if (contentRef.current) gsap.fromTo(contentRef.current, { opacity: 0, scale: 0.95, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" });
        }
    }, [isOpen]);

    // Polling Payment Status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        let isPolling = polling;

        if (isPolling && activeOrderId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/payment/status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: activeOrderId, autoCheckUrl })
                    });
                    
                    const data = await res.json();
                    
                    if (res.ok && (data.status === 'SUCCESS' || data.txn_status === 'SUCCESS' || data.gatewayStatus === 'SUCCESS')) {
                        setPolling(false);
                        onClose();
                        window.location.reload(); 
                    } else if (!res.ok) {
                        const status = data.gatewayStatus || data.status;
                        if (status === 'FAILED' || status === 'ERROR') {
                            setPolling(false);
                            setError("Payment failed or was cancelled.");
                            setUpiIntent("");
                        }
                        // If PENDING or CREATED, just let it poll again
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000); // Poll every 3 seconds
        }
        return () => clearInterval(interval);
    }, [polling, activeOrderId, autoCheckUrl, onClose]);

    // Timer Countdown
    useEffect(() => {
        let timerParams: NodeJS.Timeout;
        if (polling && timeLeft > 0) {
            timerParams = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft <= 0 && polling) {
            setPolling(false);
            setError("Payment session expired.");
            setUpiIntent("");
        }
        return () => clearInterval(timerParams);
    }, [polling, timeLeft]);

    if (!isOpen) return null;

    const handlePayment = async () => {
        setLoading(true);
        setError("");
        try {
            const randomMobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

            const res = await fetch(`/api/payment/create?t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    userId: uid, 
                    customerMobile: randomMobile 
                })
            });

            const data = await res.json();
            
            if ((data.status === 'success' || data.status === true) && data.upiIntent) {
                // Success Native QR extraction
                setUpiIntent(data.upiIntent);
                setActiveOrderId(data.orderId);
                if (data.autoCheckUrl) setAutoCheckUrl(data.autoCheckUrl);
                setTimeLeft(300);
                setPolling(true);
            } else {
                const msg = data.error || data.message || "Failed to initiate payment QR";
                setError(msg);
            }

        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div ref={contentRef} className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 relative shadow-2xl shadow-primary/10">
                <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold font-rajdhani text-white mb-6">
                    {upiIntent ? "Scan to Pay" : "Add Funds"}
                </h2>

                {upiIntent ? (
                    // NATIVE QR VIEW
                    <div className="space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] w-fit mx-auto relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiIntent)}&size=200x200`} 
                                alt="UPI QR Code" 
                                className="w-48 h-48 object-contain relative z-10"
                            />
                        </div>

                        <div className="text-center space-y-1">
                            <p className="text-3xl font-rajdhani font-bold text-white tracking-wider">₹{amount}</p>
                            <p className="text-sm font-medium text-red-400 font-mono bg-red-500/10 px-3 py-1 rounded-full inline-block">
                                Time remaining: {formatTime(timeLeft)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2 px-4 leading-relaxed">
                                Scan this QR using any UPI app (GPay, PhonePe, Paytm, etc.)
                            </p>
                        </div>

                        <div className="w-full relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                            <div className="relative flex justify-center text-[10px] font-bold tracking-widest uppercase"><span className="bg-card px-3 text-muted-foreground">OR</span></div>
                        </div>

                        <a 
                            href={upiIntent}
                            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group border border-primary/50"
                        >
                            <Smartphone size={18} className="group-hover:-rotate-12 transition-transform" />
                            Pay via UPI App
                        </a>

                        <div className="flex items-center gap-3 text-xs text-primary/80 bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl justify-center w-full">
                            <GsapLoader size="sm" className="border-primary/50 border-t-primary w-4 h-4 border-2" />
                            <span className="font-medium tracking-wide">Waiting for payment confirmation...</span>
                        </div>
                    </div>
                ) : (
                    // ADD FUNDS FORM
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {["100", "500", "1000"].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setAmount(amt)}
                                    className={`py-2 rounded-lg border text-sm font-bold transition-all ${amount === amt ? "border-primary bg-primary/20 text-primary" : "border-border bg-black/20 text-muted-foreground hover:text-white hover:bg-white/5"}`}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Enter Amount (₹)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-black/20 border border-border rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors font-rajdhani font-bold text-lg"
                                placeholder="100"
                            />
                        </div>

                        {error && <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-center font-medium">{error}</p>}

                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <GsapLoader size="sm" className="border-white/50 border-t-white" /> : <ShieldCheck size={18} />}
                            {loading ? "Processing..." : `Pay ₹${amount}`}
                        </button>

                        <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1.5 opacity-70">
                            <ShieldCheck size={12} /> Secured by ZapUPI Network
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
