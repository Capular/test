"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Save, Trash2, Power, ImageIcon, Plus, X, MapPin, Settings, Bot, Image } from "lucide-react";
import GsapLoader, { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Crosshair } from "lucide-react";
import gsap from "gsap";
import GameAutomation from "@/components/admin/GameAutomation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Game {
    id: string;
    name: string;
    coverImage?: string;
    description?: string;
    isActive: boolean;
    createdAt?: any;
    gamemodes?: string[];
    gamemodeDetails?: Record<string, { bannerUrl: string }>;
    rules?: string;
    bannerImage?: string;
    bannerFocusX?: number; // 0-100 percentage
    bannerFocusY?: number; // 0-100 percentage
    socialLinks?: {
        discord?: string;
        website?: string;
    };
    defaultSettings?: {
        minEntryFee?: number;
        maxEntryFee?: number;
        perKillBonus?: number;
    };
}

type TabId = "overview" | "gamemodes" | "settings" | "automation";

export default function GameDetailPage() {
    const params = useParams();
    const router = useRouter();
    const gameId = params.id as string;

    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>("overview");

    // Form states
    const [name, setName] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [description, setDescription] = useState("");
    // State for Gamemodes
    const [gamemodes, setGamemodes] = useState<string[]>([]);
    const [gamemodeDetails, setGamemodeDetails] = useState<Record<string, { bannerUrl: string }>>({});

    // Add Gamemode Dialog State
    const [isGmDialogOpen, setIsGmDialogOpen] = useState(false);
    const [newGmName, setNewGmName] = useState("");
    const [newGmBanner, setNewGmBanner] = useState("");

    const [rules, setRules] = useState("");
    const [bannerImage, setBannerImage] = useState("");
    const [bannerFocusX, setBannerFocusX] = useState(50);
    const [bannerFocusY, setBannerFocusY] = useState(50);
    const [discord, setDiscord] = useState("");
    const [website, setWebsite] = useState("");
    const [minEntryFee, setMinEntryFee] = useState(0);
    const [maxEntryFee, setMaxEntryFee] = useState(0);
    const [perKillBonus, setPerKillBonus] = useState(0);

    // Refs for animations
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const tabContentRef = useRef<HTMLDivElement>(null);

    const fetchGame = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, "games", gameId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Game;
                setGame(data);
                // Populate form
                setName(data.name || "");
                setCoverImage(data.coverImage || "");
                setDescription(data.description || "");
                setGamemodes(data.gamemodes || []);
                setGamemodeDetails(data.gamemodeDetails || {}); // Load details
                setRules(data.rules || "");
                setDiscord(data.socialLinks?.discord || "");
                setWebsite(data.socialLinks?.website || "");
                setMinEntryFee(data.defaultSettings?.minEntryFee || 0);
                setMaxEntryFee(data.defaultSettings?.maxEntryFee || 0);
                setPerKillBonus(data.defaultSettings?.perKillBonus || 0);
                setBannerImage(data.bannerImage || "");
                setBannerFocusX(data.bannerFocusX ?? 50);
                setBannerFocusY(data.bannerFocusY ?? 50);
            } else {
                router.push("/admin/games");
            }
        } catch (error) {
            console.error("Error fetching game:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (gameId) {
            fetchGame();
        }
    }, [gameId]);

    const handleSave = async () => {
        if (!game) return;
        setIsSaving(true);
        try {
            // Check for removed gamemodes
            const originalGamemodes = game.gamemodes || [];
            const removedGamemodes = originalGamemodes.filter(g => !gamemodes.includes(g));

            if (removedGamemodes.length > 0) {
                if (confirm(`Removing gamemodes [${removedGamemodes.join(", ")}] will delete ALL associated automation templates. This cannot be undone. Continue?`)) {
                    // Batch delete templates
                    const batch = writeBatch(db);

                    // Chunk removed gamemodes into groups of 10 for 'in' query
                    const chunks = [];
                    for (let i = 0; i < removedGamemodes.length; i += 10) {
                        chunks.push(removedGamemodes.slice(i, i + 10));
                    }

                    for (const chunk of chunks) {
                        const q = query(
                            collection(db, "templates"),
                            where("gameId", "==", game.id),
                            where("gamemode", "in", chunk)
                        );
                        const snap = await getDocs(q);
                        snap.forEach(doc => batch.delete(doc.ref));
                    }

                    await batch.commit();
                } else {
                    setIsSaving(false);
                    return; // Abort save
                }
            }

            // Clean up details for removed gamemodes
            const cleanDetails = { ...gamemodeDetails };
            removedGamemodes.forEach(g => delete cleanDetails[g]);

            await updateDoc(doc(db, "games", game.id), {
                name: name.trim(),
                coverImage: coverImage.trim(),
                bannerImage: bannerImage.trim(),
                bannerFocusX: bannerFocusX,
                bannerFocusY: bannerFocusY,
                description: description.trim(),
                gamemodes,
                gamemodeDetails: cleanDetails, // Save details
                rules: rules.trim(),
                socialLinks: {
                    discord: discord.trim(),
                    website: website.trim(),
                },
                defaultSettings: {
                    minEntryFee,
                    maxEntryFee,
                    perKillBonus,
                },
            });
            // Success animation
            gsap.fromTo(".save-btn", { scale: 1 }, { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 });
            fetchGame();
        } catch (error) {
            console.error("Error saving game:", error);
            alert("Error saving game changes.");
        }
        setIsSaving(false);
    };

    const handleToggleStatus = async () => {
        if (!game) return;
        try {
            await updateDoc(doc(db, "games", game.id), {
                isActive: !game.isActive
            });
            fetchGame();
        } catch (error) {
            console.error("Error toggling status:", error);
        }
    };

    const handleDelete = async () => {
        if (!game) return;
        if (confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
            await deleteDoc(doc(db, "games", game.id));
            router.push("/admin/games");
        }
    };

    const handleAddGamemode = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newGmName.trim();
        if (trimmedName && !gamemodes.includes(trimmedName)) {
            setGamemodes([...gamemodes, trimmedName]);
            if (newGmBanner.trim()) {
                setGamemodeDetails(prev => ({
                    ...prev,
                    [trimmedName]: { bannerUrl: newGmBanner.trim() }
                }));
            }
            setNewGmName("");
            setNewGmBanner("");
            setIsGmDialogOpen(false);
        }
    };

    const removeGamemode = (modeName: string) => {
        setGamemodes(gamemodes.filter(m => m !== modeName));
        const newDetails = { ...gamemodeDetails };
        delete newDetails[modeName];
        setGamemodeDetails(newDetails);
    };

    const tabs = [
        { id: "overview" as TabId, label: "Overview", icon: ImageIcon },
        { id: "gamemodes" as TabId, label: "Gamemodes", icon: MapPin },
        { id: "automation" as TabId, label: "Automation", icon: Bot },
        { id: "settings" as TabId, label: "Settings", icon: Settings },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <GsapLoader size="lg" className="text-primary" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                <p>Game not found.</p>
                <Button variant="link" onClick={() => router.push("/admin/games")}>Go back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/admin/games")} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold font-rajdhani text-foreground">{game.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {game.isActive ? (
                                <span className="text-green-500">● Active</span>
                            ) : (
                                <span className="text-red-500">● Inactive</span>
                            )}
                            {" · "}Added {game.createdAt?.toDate ? game.createdAt.toDate().toLocaleDateString() : "recently"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleToggleStatus} className="gap-1.5">
                        <Power size={14} /> {game.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                        <Trash2 size={14} /> Delete
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="save-btn gap-1.5">
                        {isSaving ? <GsapLoaderInline size="sm" className="mr-1" /> : <Save size={14} />} Save Changes
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div ref={contentRef}>
                {/* Main Content */}
                <div>
                    {/* Tabs */}
                    <div className="flex justify-start mb-6">
                        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-1 border border-border/50 flex gap-1">
                            {tabs.map((tab) => {
                                const isActiveTab = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${isActiveTab
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                            }`}
                                    >
                                        <tab.icon size={16} />
                                        <span className="font-rajdhani">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div ref={tabContentRef}>
                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                {/* Name */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-foreground font-rajdhani">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Game Name</Label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-muted/30 border-border"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Discord Server</Label>
                                            <Input
                                                placeholder="https://discord.gg/..."
                                                value={discord}
                                                onChange={(e) => setDiscord(e.target.value)}
                                                className="bg-muted/30 border-border"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Website</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            className="bg-muted/30 border-border"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-foreground font-rajdhani">Description</h3>
                                    <Textarea
                                        placeholder="Write a brief description about this game..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-muted/30 border-border min-h-[120px]"
                                    />
                                </div>

                                {/* Rules */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-foreground font-rajdhani">Tournament Rules</h3>
                                    <Textarea
                                        placeholder="Enter default tournament rules for this game..."
                                        value={rules}
                                        onChange={(e) => setRules(e.target.value)}
                                        className="bg-muted/30 border-border min-h-[150px]"
                                    />
                                    <p className="text-xs text-muted-foreground">These rules will be shown to players before joining tournaments.</p>
                                </div>

                                {/* Tournament Banner */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Image size={18} className="text-primary" />
                                        <h3 className="font-bold text-foreground font-rajdhani">Tournament Banner</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">This banner will be shown in the background of the tournament page when this game is selected. The banner appears at the top with a soft gradient blend.</p>

                                    <div className="space-y-2">
                                        <Label className="text-foreground">Banner Image URL</Label>
                                        <Input
                                            placeholder="https://example.com/banner.jpg"
                                            value={bannerImage}
                                            onChange={(e) => setBannerImage(e.target.value)}
                                            className="bg-muted/30 border-border"
                                        />
                                    </div>

                                    {/* Interactive Focal Point Picker */}
                                    {bannerImage && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-foreground flex items-center gap-2">
                                                    <Crosshair size={14} className="text-primary" />
                                                    Click to set focus point (PC View)
                                                </Label>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {bannerFocusX.toFixed(0)}%, {bannerFocusY.toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Click anywhere on the image to set where the focus should be on PC view.</p>

                                            {/* Clickable Image with Focal Point Marker */}
                                            <div
                                                className="relative rounded-lg overflow-hidden bg-background cursor-crosshair border border-border/50 select-none"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                    setBannerFocusX(Math.max(0, Math.min(100, x)));
                                                    setBannerFocusY(Math.max(0, Math.min(100, y)));
                                                }}
                                            >
                                                <img
                                                    src={bannerImage}
                                                    alt="Banner - Click to set focus"
                                                    className="w-full h-auto max-h-[300px] object-contain pointer-events-none"
                                                    draggable={false}
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                                {/* Focal Point Marker */}
                                                <div
                                                    className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                    style={{ left: `${bannerFocusX}%`, top: `${bannerFocusY}%` }}
                                                >
                                                    <div className="absolute inset-0 rounded-full border-2 border-primary bg-primary/20 animate-pulse" />
                                                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary -translate-y-1/2" />
                                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary -translate-x-1/2" />
                                                </div>
                                            </div>

                                            {/* Preview showing how it looks with crop */}
                                            <div className="space-y-2">
                                                <p className="text-xs text-muted-foreground">Preview (PC view with gradient blend)</p>
                                                <div className="relative h-32 rounded-lg overflow-hidden bg-background">
                                                    <img
                                                        src={bannerImage}
                                                        alt="Banner Preview"
                                                        className="w-full h-full object-cover"
                                                        style={{
                                                            objectPosition: `${bannerFocusX}% ${bannerFocusY}%`,
                                                            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                                                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
                                                        }}
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "gamemodes" && (
                            <div className="space-y-6">
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-foreground font-rajdhani">Available Gamemodes</h3>
                                            <p className="text-sm text-muted-foreground">Manage gamemodes for this game.</p>
                                        </div>
                                        {!isGmDialogOpen ? (
                                            <Button size="sm" className="gap-2" onClick={() => setIsGmDialogOpen(true)}>
                                                <Plus size={16} /> Add Gamemode
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsGmDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>

                                    {/* Inline Form */}
                                    {isGmDialogOpen && (
                                        <div className="bg-muted/10 border border-border/50 rounded-xl p-4 space-y-4">
                                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                <MapPin className="text-primary" size={18} /> New Gamemode
                                            </h4>
                                            <form onSubmit={handleAddGamemode} className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-foreground">Name *</Label>
                                                        <Input
                                                            placeholder="e.g. Battle Royale"
                                                            value={newGmName}
                                                            onChange={e => setNewGmName(e.target.value)}
                                                            className="bg-muted/30 border-border"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-foreground">Banner URL (Optional)</Label>
                                                        <Input
                                                            placeholder="https://..."
                                                            value={newGmBanner}
                                                            onChange={e => setNewGmBanner(e.target.value)}
                                                            className="bg-muted/30 border-border"
                                                        />
                                                    </div>
                                                </div>
                                                {newGmBanner && (
                                                    <div className="rounded-lg overflow-hidden border border-border aspect-[4/1] bg-muted/10 relative max-w-md">
                                                        <img
                                                            src={newGmBanner}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                                            <span className="text-white font-bold font-rajdhani">{newGmName || "Gamemode Name"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <Button type="button" variant="outline" onClick={() => setIsGmDialogOpen(false)}>Cancel</Button>
                                                    <Button type="submit" disabled={!newGmName.trim()}>Add Gamemode</Button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Gamemodes List */}
                                    {gamemodes.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                            {gamemodes.map((modeName, idx) => {
                                                const details = gamemodeDetails[modeName];
                                                const banner = details?.bannerUrl;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className="group relative overflow-hidden bg-muted/30 border border-border/50 rounded-lg h-20 flex items-center"
                                                    >
                                                        {/* Background Banner */}
                                                        {banner ? (
                                                            <>
                                                                <img src={banner} alt={modeName} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110" />
                                                                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
                                                            </>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-muted/50 via-transparent to-transparent" />
                                                        )}

                                                        <div className="relative z-10 px-4 flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-full ${banner ? 'bg-background/80 backdrop-blur-sm' : 'bg-primary/10'}`}>
                                                                    <MapPin size={16} className="text-primary" />
                                                                </div>
                                                                <span className="font-bold text-foreground font-rajdhani text-lg">{modeName}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeGamemode(modeName)}
                                                                className="text-muted-foreground hover:text-red-500 bg-background/50 hover:bg-background rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                                                                title="Remove Gamemode"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/5">
                                            <MapPin className="mx-auto h-10 w-10 opacity-20 mb-3" />
                                            <p className="text-sm">No gamemodes added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                {/* Cover Image Section */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-foreground font-rajdhani">Cover Image</h3>
                                    <p className="text-sm text-muted-foreground">This image will be shown as the game's thumbnail.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-transparent rounded-lg overflow-hidden border border-border/50">
                                                {coverImage ? (
                                                    <img src={coverImage} alt={name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <div className="space-y-2">
                                                <Label className="text-foreground">Cover Image URL</Label>
                                                <Input
                                                    placeholder="https://example.com/cover.jpg"
                                                    value={coverImage}
                                                    onChange={(e) => setCoverImage(e.target.value)}
                                                    className="bg-muted/30 border-border"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Recommended aspect ratio: 3:4 (portrait). Used in game listings and cards.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Default Tournament Settings */}
                                <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                                    <h3 className="font-bold text-foreground font-rajdhani">Default Tournament Settings</h3>
                                    <p className="text-sm text-muted-foreground">These values will be suggested when creating tournaments for this game.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Min Entry Fee (₹)</Label>
                                            <Input
                                                type="number"
                                                value={minEntryFee}
                                                onChange={(e) => setMinEntryFee(Number(e.target.value))}
                                                className="bg-muted/30 border-border"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Max Entry Fee (₹)</Label>
                                            <Input
                                                type="number"
                                                value={maxEntryFee}
                                                onChange={(e) => setMaxEntryFee(Number(e.target.value))}
                                                className="bg-muted/30 border-border"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground">Per Kill Bonus (₹)</Label>
                                            <Input
                                                type="number"
                                                value={perKillBonus}
                                                onChange={(e) => setPerKillBonus(Number(e.target.value))}
                                                className="bg-muted/30 border-border"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "automation" && (
                            <div className="space-y-6">
                                <GameAutomation gameId={game.id} gameName={game.name} gamemodes={game.gamemodes || []} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

