"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateSession, Session, Template, getSession, getLastSession } from "@/lib/db";
import { RotateCcw, Check, FastForward, Plus, Minus, TrendingUp } from "lucide-react";

function WorkoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    // const templateId = searchParams.get("templateId"); // Legacy support if needed, but we prefer sessionId now

    const [session, setSession] = useState<Session | null>(null);
    const [lastSession, setLastSession] = useState<Session | undefined>(undefined);

    const [currentSetIndex, setCurrentSetIndex] = useState(0); // 0-based
    const [inputReps, setInputReps] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [restSecondsLeft, setRestSecondsLeft] = useState(0);
    const [loading, setLoading] = useState(true);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize
    useEffect(() => {
        const init = async () => {
            if (!sessionId) {
                // Fallback or error?
                router.push("/");
                return;
            }
            try {
                const sess = await getSession(sessionId);
                if (!sess) {
                    router.push("/");
                    return;
                }
                setSession(sess);

                // Fetch last session for comparison
                // Note: getLastSession fetches the *last completed*. 
                // We need to ensure it's not the CURRENT one (which is started but not ended).
                // The helper `getLastSession` logic sorts and grabs first ended. Current one has endedAt=null, so safe.
                const prev = await getLastSession(sess.templateId);
                setLastSession(prev);

                // Default input reps?
                // If we have previous history, maybe default to that?
                // Or keep 0? User asked for "Previous: X" display.
                // Let's default to match previous for friction-less "same as last time"?
                // Or 0 to force explicit input?
                // Let's default to prev reps if available, else target/sets.
                if (prev && prev.repsBySet[0] !== undefined) {
                    setInputReps(prev.repsBySet[0]);
                } else {
                    setInputReps(Math.ceil(sess.templateSnapshot.targetTotal / sess.templateSnapshot.sets));
                }

            } catch (e) {
                console.error("Error starting workout", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [sessionId, router]);

    // Timer Logic
    useEffect(() => {
        if (isResting && restSecondsLeft > 0) {
            timerRef.current = setInterval(() => {
                setRestSecondsLeft((prev) => {
                    if (prev <= 1) {
                        playBeep();
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isResting, restSecondsLeft]);

    // ... (Audio logic same)
    const playBeep = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
        } catch (e) { }
    };

    const handleFinishSet = async () => {
        if (!session) return;

        const newRepsBySet = [...session.repsBySet];
        newRepsBySet[currentSetIndex] = inputReps;

        const totalReps = newRepsBySet.reduce((a, b) => a + b, 0);
        // Determine achievement based on template original target or just store?
        // Let's assume achieved if total > 0 for now.
        const isAchieved = totalReps >= session.templateSnapshot.targetTotal;

        const updatedSession = await updateSession(session.id, {
            repsBySet: newRepsBySet,
            totalReps,
            isAchieved
        });
        setSession(updatedSession);

        // Check if last set
        if (currentSetIndex >= session.templateSnapshot.sets - 1) {
            await updateSession(session.id, {
                endedAt: new Date().toISOString()
            });
            router.push(`/summary?id=${session.id}`);
        } else {
            // Start Rest
            const nextSetIndex = currentSetIndex + 1;
            setCurrentSetIndex(nextSetIndex);

            // Update default input for next set
            if (lastSession && lastSession.repsBySet[nextSetIndex] !== undefined) {
                setInputReps(lastSession.repsBySet[nextSetIndex]);
            } else {
                // Keep current or reset? User usually does similar reps.
                // Let's keep current inputReps (which was just entered for prev set)
                // setInputReps(inputReps); 
            }

            setRestSecondsLeft(session.templateSnapshot.restSec);
            setIsResting(true);
        }
    };

    const handleSkipRest = () => {
        setIsResting(false);
        setRestSecondsLeft(0);
    };

    const handleAdjustRest = (delta: number) => {
        setRestSecondsLeft((prev) => Math.max(0, prev + delta));
    };

    const handleUndo = async () => {
        if (!session) return;

        if (isResting) {
            // Undo means go back to re-do the just finished set.
            setIsResting(false);
            const prevIndex = currentSetIndex - 1; // currentSetIndex was already incremented
            // Logic error check: if resting, we are WAITING for Set N (index N). We just finished N-1.
            // So setIndex is N. We want to go back to N-1.

            // But wait: "currentSetIndex" is the index of the set we are ABOUT to do.
            // So if setSets=7. Start: index=0. Finish set 0 -> Resting. index=1.
            // Undo -> Go back to index 0.

            const targetIndex = currentSetIndex - 1;
            if (targetIndex < 0) return;

            setCurrentSetIndex(targetIndex);
            // Restore input logic
            const prevReps = session.repsBySet[targetIndex];
            setInputReps(prevReps);

            // Remove from DB
            const newRepsBySet = session.repsBySet.slice(0, targetIndex);
            const totalReps = newRepsBySet.reduce((a, b) => a + b, 0);
            const updated = await updateSession(session.id, { repsBySet: newRepsBySet, totalReps });
            setSession(updated);

        } else {
            // In input mode. Undo previous set?
            // If index > 0, we can undo previous.
            if (currentSetIndex > 0) {
                const targetIndex = currentSetIndex - 1;
                setCurrentSetIndex(targetIndex);
                const prevReps = session.repsBySet[targetIndex];
                if (prevReps !== undefined) setInputReps(prevReps);

                const newRepsBySet = session.repsBySet.slice(0, targetIndex);
                const totalReps = newRepsBySet.reduce((a, b) => a + b, 0);
                const updated = await updateSession(session.id, { repsBySet: newRepsBySet, totalReps });
                setSession(updated);
            }
        }
    };

    const handleFinishEarly = async () => {
        if (!session) return;
        await updateSession(session.id, {
            endedAt: new Date().toISOString(),
            isAchieved: session.totalReps >= session.templateSnapshot.targetTotal
        });
        router.push(`/summary?id=${session.id}`);
    };

    // Get previous reps for CURRENT set reference
    const prevReps = lastSession?.repsBySet[currentSetIndex];

    if (loading || !session) return <div className="text-center p-10 text-slate-500">Preparing workout...</div>;

    return (
        <main className="min-h-screen flex flex-col max-w-md mx-auto relative bg-[#0f172a]">
            {/* Header */}
            <header className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                    <h2 className="text-white font-bold">{session.templateSnapshot.name}</h2>
                    <div className="text-xs text-slate-400">
                        Set {currentSetIndex + 1} / {session.templateSnapshot.sets}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-blue-400">
                        {session.totalReps} <span className="text-sm text-slate-500">reps</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                {isResting ? (
                    <div className="text-center w-full animate-in fade-in zoom-in duration-300">
                        <div className="text-sm text-slate-400 mb-4 uppercase tracking-wider">Resting</div>
                        <div className="text-8xl font-mono font-bold text-white mb-8 tabular-nums tracking-tighter">
                            {Math.floor(restSecondsLeft / 60)}:{restSecondsLeft % 60 < 10 ? '0' : ''}{restSecondsLeft % 60}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button onClick={() => handleAdjustRest(-15)} className="btn-secondary rounded-full w-16 h-16 flex items-center justify-center font-bold">-15</button>
                            <button onClick={handleSkipRest} className="bg-white text-black hover:bg-slate-200 rounded-full w-20 h-20 flex items-center justify-center shadow-lg transform hover:scale-105 transition-all">
                                <FastForward fill="currentColor" />
                            </button>
                            <button onClick={() => handleAdjustRest(15)} className="btn-secondary rounded-full w-16 h-16 flex items-center justify-center font-bold">+15</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center w-full animate-in slide-in-from-bottom-5 duration-300">
                        <div className="mb-6">
                            <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">Reps for Set {currentSetIndex + 1}</div>
                            {prevReps !== undefined && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                    <span className="text-sm text-slate-300">Previous: <span className="text-white font-bold">{prevReps}</span></span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-8 mb-10">
                            <button
                                onClick={() => setInputReps(r => Math.max(0, r - 1))}
                                className="w-20 h-20 rounded-full btn-secondary flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
                            >
                                <Minus size={32} />
                            </button>
                            <div className="text-8xl font-bold text-white tabular-nums min-w-[120px]">
                                {inputReps}
                            </div>
                            <button
                                onClick={() => setInputReps(r => r + 1)}
                                className="w-20 h-20 rounded-full btn-secondary flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
                            >
                                <Plus size={32} />
                            </button>
                        </div>

                        <button
                            onClick={handleFinishSet}
                            className="w-full max-w-xs btn-primary py-5 rounded-2xl text-xl font-bold tracking-wide shadow-lg mx-auto block active:scale-95 transition-all"
                        >
                            COMPLETE SET
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md grid grid-cols-2 gap-4">
                <button
                    onClick={handleUndo}
                    disabled={currentSetIndex === 0 && !isResting}
                    className="btn-secondary py-3 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RotateCcw size={16} /> Undo
                </button>
                <button
                    onClick={handleFinishEarly}
                    className="btn-secondary bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                >
                    <Check size={16} /> Finish
                </button>
            </footer>
        </main>
    );
}

export default function WorkoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen text-white flex items-center justify-center">Loading...</div>}>
            <WorkoutContent />
        </Suspense>
    );
}
