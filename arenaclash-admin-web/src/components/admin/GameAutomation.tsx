"use client";

import { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, query, orderBy, where, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, LayoutTemplate, Users, RefreshCw, Power, FileText, X, Pencil } from "lucide-react";
import gsap from "gsap";
import GsapLoader, { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Template {
    id: string;
    name: string;
    gameId: string;
    gameName: string;
    type: 'solo' | 'duo' | 'squad';
    format: 'scrim' | 'championship';
    playersPerTeam: number;
    teamsPerRoom: number;
    maxPlayersPerRoom: number; // Calculated
    entryFee: number;
    perKillAmount: number;
    rankPrizes: { rank: number, amount: number }[]; // Added rank prizes
    autoCreateRooms: boolean;
    startTimeThreshold: number; // Minutes
    rescheduleInterval: number; // Minutes
    isActive: boolean;
    createdAt?: any;
    gamemode?: string;
    totalRounds: number; // Added totalRounds
    rules?: string[]; // Custom rules
}

interface GameAutomationProps {
    gameId: string;
    gameName: string;
    gamemodes: string[];
}

export default function GameAutomation({ gameId, gameName, gamemodes }: GameAutomationProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAddLoading, setIsAddLoading] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Template>>({
        name: "",
        type: 'solo',
        format: 'scrim',
        gamemode: gamemodes[0] || "",
        playersPerTeam: 1,
        teamsPerRoom: 25, // Default for 100 players in Squad (4*25)
        maxPlayersPerRoom: 100, // Calculated
        entryFee: 0,
        perKillAmount: 0,
        rankPrizes: [{ rank: 1, amount: 0 }],
        autoCreateRooms: true,
        startTimeThreshold: 30, // Default 30 mins
        rescheduleInterval: 30, // Default 30 mins
        isActive: true,
        totalRounds: 1, // Default 1 round
        rules: [] // Empty rules array
    });

    const listRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const fetchTemplates = async () => {
        setIsLoading(true);
        // Query templates ONLY for this game
        const q = query(
            collection(db, "templates"),
            where("gameId", "==", gameId),
            orderBy("createdAt", "desc")
        );

        try {
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
            setTemplates(data);
        } catch (error) {
            console.error("Error fetching templates:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (gameId) fetchTemplates();
    }, [gameId]); // Fetch when gameId is available

    // Animation
    useEffect(() => {
        if (listRef.current && templates.length > 0 && !isLoading) {
            gsap.fromTo(
                listRef.current.children,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [templates, isLoading]);

    // Form Entrance Animation - Optimized with GPU acceleration
    useEffect(() => {
        if (isDialogOpen && formRef.current) {
            // Kill any existing animations first
            gsap.killTweensOf(formRef.current);

            // Use transform3d for GPU acceleration
            gsap.set(formRef.current, {
                willChange: "transform, opacity",
                visibility: "visible"
            });

            gsap.fromTo(
                formRef.current,
                { y: -15, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.15,
                    ease: "power1.out",
                    force3D: true,
                    onComplete: () => {
                        // Clean up will-change after animation
                        gsap.set(formRef.current, { willChange: "auto" });
                    }
                }
            );
        }
    }, [isDialogOpen]);

    // Format Logic
    useEffect(() => {
        const ppt = formData.playersPerTeam || 1;
        const tpr = formData.teamsPerRoom || 1;
        setFormData(prev => ({ ...prev, maxPlayersPerRoom: ppt * tpr }));
    }, [formData.playersPerTeam, formData.teamsPerRoom]);

    const handleTypeChange = (type: 'solo' | 'duo' | 'squad') => {
        let ppt = 1;
        if (type === 'duo') ppt = 2;
        if (type === 'squad') ppt = 4;

        setFormData(prev => ({
            ...prev,
            type,
            playersPerTeam: ppt
        }));
    };

    const handleAddTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsAddLoading(true);
        try {
            if (editingTemplateId) {
                // Update existing template
                await updateDoc(doc(db, "templates", editingTemplateId), {
                    ...formData,
                    gameId,
                    gameName
                });
            } else {
                // Create new template
                await addDoc(collection(db, "templates"), {
                    ...formData,
                    gameId,
                    gameName,
                    createdAt: Timestamp.now()
                });
            }
            setIsDialogOpen(false);
            setEditingTemplateId(null);
            fetchTemplates();
            // Reset form
            resetForm();
        } catch (error) {
            console.error("Error saving template:", error);
        }
        setIsAddLoading(false);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            type: 'solo',
            format: 'scrim',
            gamemode: gamemodes[0] || "",
            playersPerTeam: 1,
            teamsPerRoom: 25,
            maxPlayersPerRoom: 25,
            entryFee: 0,
            perKillAmount: 0,
            rankPrizes: [{ rank: 1, amount: 0 }],
            autoCreateRooms: true,
            startTimeThreshold: 30,
            rescheduleInterval: 30,
            isActive: true,
            totalRounds: 1,
            rules: []
        });
    };

    const handleEditTemplate = (template: Template) => {
        setFormData({
            name: template.name,
            type: template.type,
            format: template.format,
            gamemode: template.gamemode || gamemodes[0] || "",
            playersPerTeam: template.playersPerTeam,
            teamsPerRoom: template.teamsPerRoom,
            maxPlayersPerRoom: template.maxPlayersPerRoom,
            entryFee: template.entryFee,
            perKillAmount: template.perKillAmount,
            rankPrizes: template.rankPrizes || [{ rank: 1, amount: 0 }],
            autoCreateRooms: template.autoCreateRooms,
            startTimeThreshold: template.startTimeThreshold,
            rescheduleInterval: template.rescheduleInterval,
            isActive: template.isActive,
            totalRounds: template.totalRounds || 1,
            rules: template.rules || []
        });
        setEditingTemplateId(template.id);
        startTransition(() => setIsDialogOpen(true));
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this template? Existing rooms will not be deleted.")) {
            await deleteDoc(doc(db, "templates", id));
            fetchTemplates();
        }
    };

    const toggleStatus = async (template: Template) => {
        try {
            await updateDoc(doc(db, "templates", template.id), { isActive: !template.isActive });
            fetchTemplates();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold font-rajdhani text-foreground">Infinite Templates</h3>
                        <p className="text-sm text-muted-foreground">Manage automated matchmaking templates for {gameName}.</p>
                    </div>

                    {!isDialogOpen ? (
                        <Button
                            onClick={() => {
                                resetForm();
                                setEditingTemplateId(null);
                                startTransition(() => setIsDialogOpen(true));
                            }}
                            className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 gap-2"
                        >
                            <Plus size={18} /> New Template
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => {
                                startTransition(() => setIsDialogOpen(false));
                                setEditingTemplateId(null);
                                resetForm();
                            }}
                            className="gap-2"
                        >
                            Cancel
                        </Button>
                    )}
                </div>

                {/* Form View (Full Width) */}
                {isDialogOpen ? (
                    <div ref={formRef} style={{ visibility: "hidden" }}>
                        <div className="bg-muted/10 border border-border/50 rounded-xl p-6">
                            <h2 className="text-xl font-bold font-rajdhani mb-6 flex items-center gap-2">
                                <LayoutTemplate className="text-primary" /> {editingTemplateId ? 'Edit Template' : 'Create Match Template'}
                            </h2>

                            <form onSubmit={handleAddTemplate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Template Name</Label>
                                        <Input
                                            placeholder="e.g. Daily Scrim Solo"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="bg-muted/30"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Gamemode</Label>
                                        <Select
                                            value={formData.gamemode}
                                            onValueChange={(val) => setFormData({ ...formData, gamemode: val })}
                                        >
                                            <SelectTrigger className="bg-muted/30 border-border">
                                                <SelectValue placeholder="Select Gamemode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {gamemodes.map(g => (
                                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Match Type</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['solo', 'duo', 'squad'].map((t) => (
                                            <div
                                                key={t}
                                                onClick={() => handleTypeChange(t as any)}
                                                className={`cursor-pointer text-center py-3 rounded-md border text-sm font-medium transition-all ${formData.type === t
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30'
                                                    }`}
                                            >
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label>Entry Fee (₹)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={formData.entryFee || 0}
                                                onChange={e => setFormData({ ...formData, entryFee: Number(e.target.value) })}
                                                className="bg-muted/30 pl-6"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Per Kill (₹)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={formData.perKillAmount || 0}
                                                onChange={e => setFormData({ ...formData, perKillAmount: Number(e.target.value) })}
                                                className="bg-muted/30 pl-6"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teams / Room</Label>
                                        <Input
                                            type="number"
                                            min={2}
                                            value={formData.teamsPerRoom}
                                            onChange={e => setFormData({ ...formData, teamsPerRoom: Number(e.target.value) })}
                                            className="bg-muted/30"
                                        />
                                    </div>
                                </div>

                                {/* Rank Prizes Section */}
                                <div className="space-y-3 border-t border-border/50 pt-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <Users size={16} /> Rank Prizes
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 text-xs font-bold"
                                            onClick={() => {
                                                const currentRanks = formData.rankPrizes || [];
                                                const nextRank = currentRanks.length + 1;
                                                if (nextRank <= (formData.maxPlayersPerRoom || 100)) {
                                                    setFormData({
                                                        ...formData,
                                                        rankPrizes: [...currentRanks, { rank: nextRank, amount: 0 }]
                                                    });
                                                } else {
                                                    alert("Cannot add more ranks than total players!");
                                                }
                                            }}
                                        >
                                            <Plus size={14} className="mr-1" /> Add Rank {((formData.rankPrizes?.length || 0) + 1)}
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                        {formData.rankPrizes?.map((rp, index) => (
                                            <div key={rp.rank} className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border shadow-sm">
                                                <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-lg text-sm font-bold text-primary flex-shrink-0 font-rajdhani">
                                                    #{rp.rank}
                                                </div>
                                                <div className="relative w-full">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">₹</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={rp.amount}
                                                        onChange={(e) => {
                                                            const newPrizes = [...(formData.rankPrizes || [])];
                                                            newPrizes[index].amount = Number(e.target.value);
                                                            setFormData({ ...formData, rankPrizes: newPrizes });
                                                        }}
                                                        className="h-8 text-sm pl-5 bg-muted/30 font-bold"
                                                    />
                                                </div>
                                                {index > 0 && index === (formData.rankPrizes?.length || 0) - 1 && (
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                rankPrizes: formData.rankPrizes?.slice(0, -1)
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rules Section */}
                                <div className="space-y-3 border-t border-border/50 pt-4">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <FileText size={16} /> Match Rules
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 text-xs font-bold"
                                            onClick={() => {
                                                const currentRules = formData.rules || [];
                                                setFormData({
                                                    ...formData,
                                                    rules: [...currentRules, ""]
                                                });
                                            }}
                                        >
                                            <Plus size={14} className="mr-1" /> Add Rule
                                        </Button>
                                    </div>

                                    {(formData.rules?.length === 0) && (
                                        <p className="text-xs text-muted-foreground italic">No custom rules added. Default rules will apply.</p>
                                    )}

                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {formData.rules?.map((rule, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    placeholder={`Rule ${index + 1}...`}
                                                    value={rule}
                                                    onChange={(e) => {
                                                        const newRules = [...(formData.rules || [])];
                                                        newRules[index] = e.target.value;
                                                        setFormData({ ...formData, rules: newRules });
                                                    }}
                                                    className="bg-muted/30 flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-red-500"
                                                    onClick={() => {
                                                        const newRules = formData.rules?.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, rules: newRules });
                                                    }}
                                                >
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Total Players (Calculated)</Label>
                                    <div className="h-10 px-3 rounded-md border border-border/50 bg-muted/50 flex items-center text-sm font-bold text-muted-foreground cursor-not-allowed w-full">
                                        {formData.maxPlayersPerRoom} Players
                                    </div>
                                </div>

                                <div className="border-t border-border/50 pt-6">
                                    <Label className="mb-4 block text-lg font-rajdhani font-bold text-primary">Automation Settings</Label>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Total Rounds</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={formData.totalRounds || 1}
                                                onChange={e => setFormData({ ...formData, totalRounds: Math.max(1, Number(e.target.value)) })}
                                                className="bg-muted/30"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Multiplier for kill limits</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Start Threshold (Mins)</Label>
                                            <Input
                                                type="number"
                                                value={formData.startTimeThreshold}
                                                onChange={e => setFormData({ ...formData, startTimeThreshold: Number(e.target.value) })}
                                                className="bg-muted/30"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Sets start time from 1st join</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Reschedule (Mins)</Label>
                                            <Input
                                                type="number"
                                                value={formData.rescheduleInterval}
                                                onChange={e => setFormData({ ...formData, rescheduleInterval: Number(e.target.value) })}
                                                className="bg-muted/30"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Added if room not full</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => startTransition(() => setIsDialogOpen(false))}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isAddLoading} className="flex-1 font-bold text-lg h-12">
                                        {isAddLoading ? <GsapLoaderInline size="sm" className="mr-2" /> : null}
                                        {editingTemplateId ? 'Save Changes' : 'Create Template'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Initial View: List of Templates */
                    isLoading ? (
                        <div className="flex justify-center py-8">
                            <GsapLoader size="md" className="text-primary" />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/5">
                            <LayoutTemplate className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>No automation templates for {gameName} yet.</p>
                        </div>
                    ) : (
                        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((t) => (
                                <div key={t.id} className={`group bg-muted/20 border rounded-xl overflow-hidden shadow-sm hover:border-primary/30 transition-all ${t.isActive ? 'border-border/50' : 'border-red-500/30 opacity-70'}`}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-foreground font-rajdhani">{t.name}</h3>
                                                <p className="text-xs text-muted-foreground capitalize">{t.gamemode} • {t.type} • {t.format}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEditTemplate(t)}
                                                    title="Edit Template"
                                                >
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={() => toggleStatus(t)}
                                                    title={t.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    <Power size={14} className={t.isActive ? "text-green-500" : "text-red-500"} />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleDelete(t.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs">
                                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                                                <Users size={12} />
                                                <span>{t.maxPlayersPerRoom} Players</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                                                <Users size={12} />
                                                <span>{t.teamsPerRoom} Teams</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 px-2 py-1 rounded col-span-2">
                                                <RefreshCw size={12} />
                                                <span>Start +{t.startTimeThreshold}m / Retry +{t.rescheduleInterval}m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
