/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
// Added runTransaction
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, query, orderBy, updateDoc, runTransaction, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, Gamepad2, PlusCircle, Pencil, Power, ImageIcon } from "lucide-react";
import gsap from "gsap";
import GsapLoader, { GsapLoaderInline } from "@/components/ui/GsapLoader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Game {
    id: string;
    name: string;
    numericId: string;
    coverImage?: string;
    isActive: boolean;
    createdAt?: any;
}

export default function AdminGames() {
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddLoading, setIsAddLoading] = useState(false);
    const [newGameName, setNewGameName] = useState("");
    // Removed newGameId state
    const [newGameCover, setNewGameCover] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Edit state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [editGameName, setEditGameName] = useState("");
    const [editGameId, setEditGameId] = useState("");
    const [editGameCover, setEditGameCover] = useState("");
    const [isEditLoading, setIsEditLoading] = useState(false);

    const listRef = useRef<HTMLDivElement>(null);

    const fetchGames = async () => {
        setIsLoading(true);
        const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
        setGames(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchGames();
    }, []);

    useEffect(() => {
        if (listRef.current && games.length > 0 && !isLoading) {
            gsap.fromTo(
                listRef.current.children,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [games, isLoading]);

    const handleAddGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGameName.trim()) return;

        setIsAddLoading(true);
        try {
            await runTransaction(db, async (transaction) => {
                // 1. Get Global Game Counter
                const counterRef = doc(db, "counters", "global_game_counter");
                const counterSnap = await transaction.get(counterRef);

                let nextId = 100; // Default start
                if (counterSnap.exists()) {
                    const data = counterSnap.data();
                    if (data?.lastId) {
                        nextId = data.lastId + 1;
                    }
                }

                // 2. Create Game Doc Ref
                const newGameRef = doc(collection(db, "games"));

                // 3. Write Game
                transaction.set(newGameRef, {
                    name: newGameName.trim(),
                    numericId: nextId.toString(),
                    coverImage: newGameCover.trim() || "",
                    isActive: true,
                    createdAt: Timestamp.now()
                });

                // 4. Update Counter
                transaction.set(counterRef, { lastId: nextId }, { merge: true });
            });

            setNewGameName("");
            setNewGameCover("");
            setIsDialogOpen(false);
            fetchGames();
        } catch (error) {
            console.error("Error adding game with auto ID:", error);
            alert("Failed to create game. Please try again.");
        }
        setIsAddLoading(false);
    };

    const handleDeleteGame = async (id: string) => {
        if (confirm("Are you sure you want to delete this game? This action cannot be undone and will delete all associated templates.")) {
            // Batch delete: Game + Templates
            try {
                const batch = await import("firebase/firestore").then(m => m.writeBatch(db));
                // 1. Find templates
                const templatesQuery = query(collection(db, "templates"), orderBy("createdAt"), where("gameId", "==", id));
                // orderBy might fail if index missing with where, safe to skip orderBy for deletion? 
                // Using simple where.
                const q = query(collection(db, "templates"), where("gameId", "==", id));
                const snap = await getDocs(q);

                snap.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                batch.delete(doc(db, "games", id));
                await batch.commit();
                fetchGames();
            } catch (error) {
                console.error("Error deleting game:", error);
                alert("Failed to delete game. Check console for details.");
            }
        }
    };

    const toggleGameStatus = async (game: Game) => {
        try {
            await updateDoc(doc(db, "games", game.id), {
                isActive: !game.isActive
            });
            fetchGames();
        } catch (error) {
            console.error("Error updating game status:", error);
        }
    };

    const openEditDialog = (game: Game) => {
        setEditingGame(game);
        setEditGameName(game.name);
        setEditGameId(game.numericId || "");
        setEditGameCover(game.coverImage || "");
        setIsEditDialogOpen(true);
    };

    const handleEditGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGame || !editGameName.trim()) return;
        // removed ID check since it's read only

        setIsEditLoading(true);
        try {
            await updateDoc(doc(db, "games", editingGame.id), {
                name: editGameName.trim(),
                coverImage: editGameCover.trim() || ""
                // numericId should NOT be updated
            });
            setIsEditDialogOpen(false);
            setEditingGame(null);
            fetchGames();
        } catch (error) {
            console.error("Error updating game:", error);
        }
        setIsEditLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold font-rajdhani text-foreground">All Games</h2>

                {/* Add Game Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 gap-2">
                            <PlusCircle size={18} /> Add New Game
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Add Game</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Add a new game. A 3-digit ID will be assigned automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddGame} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-foreground">Game Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. BGMI, COD Mobile"
                                    value={newGameName}
                                    onChange={(e) => setNewGameName(e.target.value)}
                                    className="bg-muted/30 border-border text-foreground"
                                />
                            </div>

                            {/* Removed Manual ID Input */}

                            <div className="space-y-2">
                                <Label htmlFor="cover" className="text-foreground">Cover Image URL</Label>
                                <Input
                                    id="cover"
                                    placeholder="https://example.com/game-cover.jpg"
                                    value={newGameCover}
                                    onChange={(e) => setNewGameCover(e.target.value)}
                                    className="bg-muted/30 border-border text-foreground"
                                />
                                <p className="text-xs text-muted-foreground">Paste a direct link to an image (optional)</p>
                            </div>
                            {newGameCover && (
                                <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted/10">
                                    <img src={newGameCover} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                </div>
                            )}
                            <DialogFooter>
                                <Button type="submit" disabled={isAddLoading || !newGameName.trim()} className="w-full">
                                    {isAddLoading ? <GsapLoaderInline size="sm" className="mr-2" /> : null}
                                    Add Game (Auto ID)
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Game Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Edit Game</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Update game details.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditGame} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-foreground">Game Name *</Label>
                            <Input
                                id="edit-name"
                                value={editGameName}
                                onChange={(e) => setEditGameName(e.target.value)}
                                className="bg-muted/30 border-border text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-gameid" className="text-foreground">Numeric ID (Read Only)</Label>
                            <Input
                                id="edit-gameid"
                                value={editGameId}
                                readOnly
                                disabled
                                className="bg-muted/50 border-border text-foreground font-mono opacity-70 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-cover" className="text-foreground">Cover Image URL</Label>
                            <Input
                                id="edit-cover"
                                value={editGameCover}
                                onChange={(e) => setEditGameCover(e.target.value)}
                                className="bg-muted/30 border-border text-foreground"
                            />
                        </div>
                        {editGameCover && (
                            <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted/10">
                                <img src={editGameCover} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isEditLoading || !editGameName.trim()} className="w-full">
                                {isEditLoading ? <GsapLoaderInline size="sm" className="mr-2" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <GsapLoader size="lg" className="text-primary" />
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/5">
                    <Gamepad2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
                    <p>No games added yet. Click "Add New Game" to start.</p>
                </div>
            ) : (
                <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {games.map((game) => (
                        <div
                            key={game.id}
                            className="group relative h-full"
                            onMouseEnter={(e) => {
                                const card = e.currentTarget.querySelector('.game-card');
                                const image = e.currentTarget.querySelector('.game-cover');
                                gsap.to(card, { y: -6, duration: 0.3, ease: "power2.out", overwrite: "auto" });
                                gsap.to(image, { scale: 1.08, duration: 0.5, ease: "power2.out", overwrite: "auto" });
                            }}
                            onMouseLeave={(e) => {
                                const card = e.currentTarget.querySelector('.game-card');
                                const image = e.currentTarget.querySelector('.game-cover');
                                gsap.to(card, { y: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
                                gsap.to(image, { scale: 1, duration: 0.5, ease: "power3.out", overwrite: "auto" });
                            }}
                        >
                            <div
                                className={`game-card relative h-full bg-card border rounded-2xl overflow-hidden shadow-sm transition-colors ${game.isActive ? 'border-border/50' : 'border-red-500/30 opacity-60'
                                    }`}
                            >
                                {/* Cover Image */}
                                <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent relative overflow-hidden">
                                    {game.coverImage ? (
                                        <img
                                            src={game.coverImage}
                                            alt={game.name}
                                            className="game-cover w-full h-full object-cover origin-center will-change-transform"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${game.isActive
                                        ? 'bg-green-500/80 text-white'
                                        : 'bg-red-500/80 text-white'
                                        }`}>
                                        {game.isActive ? 'Active' : 'Inactive'}
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent executing card click if we add one later
                                            handleDeleteGame(game.id);
                                        }}
                                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-md text-white/70 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete Game"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-foreground font-rajdhani mb-1 truncate">{game.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        ID: <span className="font-mono bg-muted px-1 rounded">{game.numericId || "N/A"}</span> • {game.createdAt?.toDate ? game.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 gap-1.5 text-xs h-9"
                                            onClick={() => router.push(`/admin/games/${game.id}`)}
                                        >
                                            <Pencil size={14} /> Edit
                                        </Button>
                                        <Button
                                            variant={game.isActive ? "destructive" : "default"}
                                            size="sm"
                                            className={`flex-1 gap-1.5 text-xs h-9 ${!game.isActive ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                            onClick={() => toggleGameStatus(game)}
                                        >
                                            <Power size={14} /> {game.isActive ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
