"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, deleteSession, Session } from "@/lib/db";
import { CheckCircle2, XCircle, Trash2, Save } from "lucide-react";

function SummaryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getSession(id).then((s) => setSession(s || null)).finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = () => {
        router.push("/history");
    };

    const handleDiscard = async () => {
        if (confirm("Are you sure you want to discard this session?")) {
            if (id) await deleteSession(id);
            router.push("/");
        }
    };

    if (loading || !session) return <div className="text-white text-center p-10">Loading summary...</div>;

    return (
        <main className="min-h-screen p-6 flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-full glass-panel rounded-2xl p-8 mb-8 text-center animate-in zoom-in duration-300">
                <h1 className="text-slate-400 uppercase tracking-widest text-sm mb-4">Session Summary</h1>

                <div className="flex justify-center mb-6">
                    {session.isAchieved ? (
                        <CheckCircle2 size={64} className="text-green-500" />
                    ) : (
                        <XCircle size={64} className="text-slate-500" />
                    )}
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">
                    {session.isAchieved ? "Goal Achieved!" : "Good Effort"}
                </h2>
                <p className="text-slate-400 mb-8">{session.templateSnapshot.name}</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                        <div className="text-xs text-slate-400">Total Reps</div>
                        <div className="text-2xl font-bold text-white">{session.totalReps}</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                        <div className="text-xs text-slate-400">Sets Done</div>
                        <div className="text-2xl font-bold text-white">{session.repsBySet.length}</div>
                    </div>
                </div>

                <div className="text-left bg-slate-900/50 p-4 rounded-xl">
                    <div className="text-xs text-slate-500 mb-2">Set Breakdown</div>
                    <div className="flex flex-wrap gap-2 font-mono text-white">
                        {session.repsBySet.map((reps, i) => (
                            <span key={i} className="bg-slate-800 px-2 py-1 rounded text-sm">{reps}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4">
                <button onClick={handleDiscard} className="btn-secondary py-3 rounded-xl flex items-center justify-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/20">
                    <Trash2 size={20} /> Discard
                </button>
                <button onClick={handleSave} className="btn-primary py-3 rounded-xl flex items-center justify-center gap-2">
                    <Save size={20} /> Save
                </button>
            </div>
        </main>
    );
}

export default function SummaryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SummaryContent />
        </Suspense>
    );
}
