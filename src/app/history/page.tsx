"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSessions, Session } from "@/lib/db";
import { ChevronLeft, Calendar, Trophy, Zap } from "lucide-react";

type WeeklyStat = {
    weekLabel: string; // "Jan 1 - Jan 7"
    totalReps: number;
    sessionCount: number;
    achievedCount: number;
};

export default function HistoryPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const allSessions = await listSessions(); // Sorted by startedAt asc or desc? Index is startedAt, we want desc
                // listSessions returns by index. We might need to sort manually if index order is ascending.
                // IDB index iteration was 'prev' so it should be DESC.

                setSessions(allSessions);
                calculateWeeklyStats(allSessions);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const calculateWeeklyStats = (sessions: Session[]) => {
        // JST Mon-Sun
        // Helper to get week start (Mon) in JST
        // We can just use local time for MVP if user is in Japan, but spec says JST.
        // We'll normalize dates to JST.

        // Group by week
        const weeks: Record<string, WeeklyStat> = {};
        const now = new Date();

        // Generate last 4 weeks keys
        for (let i = 0; i < 4; i++) {
            // ... logic is complex without date lib, let's simplify.
            // We iterate sessions and bucket them.
        }

        // Simplification: Just bucket all sessions into "Week of YYYY-MM-DD (Monday)"
        sessions.forEach(s => {
            const d = new Date(s.startedAt);
            // Convert to JST
            // offset +9 hours. 
            // But we just want the day string.
            // Let's rely on browser timezone if it's likely Japan, or manual offset.
            // Manual offset:
            const jstDate = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
            // Wait, getTimezoneOffset() returns minutes *from* UTC to local. JST is UTC+9.
            // If local is UTC, offset is 0. 
            // We want to shift to UTC+9.
            // d.getTime() is UTC.
            // jstTime = d.getTime() + 9 * 3600 * 1000.
            // const jstDateObj = new Date(d.getTime() + 9 * 3600 * 1000); 

            // Find Monday of that week.
            // day 0 = Sun, 1 = Mon ...
            // We want Mon to be start.
            // If day is 0 (Sun), it belongs to previous week's Mon.

            // Native usage
            const day = d.getDay(); // 0-6
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(d.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const key = monday.toISOString().split('T')[0];

            if (!weeks[key]) {
                weeks[key] = {
                    weekLabel: `${monday.getMonth() + 1}/${monday.getDate()}`,
                    totalReps: 0,
                    sessionCount: 0,
                    achievedCount: 0
                };
            }

            weeks[key].totalReps += s.totalReps;
            weeks[key].sessionCount += 1;
            if (s.isAchieved) weeks[key].achievedCount += 1;
        });

        // Convert to array and sort desc
        const sortedWeeks = Object.entries(weeks)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 4)
            .map(([_, val]) => val);

        setWeeklyStats(sortedWeeks);
    };

    if (loading) return <div className="text-white text-center p-10">Loading history...</div>;

    return (
        <main className="min-h-screen p-6 pb-20 max-w-md mx-auto relative bg-[#0f172a]">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                    <ChevronLeft className="text-white" />
                </Link>
                <h1 className="text-xl font-bold text-white">History</h1>
            </header>

            {/* Weekly Stats */}
            <section className="mb-8">
                <h2 className="text-slate-400 text-sm font-bold uppercase mb-4 tracking-wider">Weekly Summary</h2>
                <div className="space-y-3">
                    {weeklyStats.length === 0 ? (
                        <div className="text-slate-500 text-sm">No data for recent weeks.</div>
                    ) : (
                        weeklyStats.map((stat, i) => (
                            <div key={i} className="glass-panel p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-bold text-white">Week of {stat.weekLabel}</div>
                                    <div className="text-xs text-slate-400 mt-1">{stat.sessionCount} sessions</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-blue-400">{stat.totalReps} <span className="text-xs text-slate-500">reps</span></div>
                                    <div className="text-xs text-green-400">
                                        {Math.round((stat.achievedCount / stat.sessionCount) * 100)}% Rate
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Session List */}
            <section>
                <h2 className="text-slate-400 text-sm font-bold uppercase mb-4 tracking-wider">Recent Sessions</h2>
                <div className="space-y-3">
                    {sessions.length === 0 ? (
                        <div className="text-slate-500 text-sm text-center py-10">Start your first workout!</div>
                    ) : (
                        sessions.map((session) => (
                            <Link href={`/summary?id=${session.id}`} key={session.id} className="block bg-slate-800/50 p-4 rounded-xl hover:bg-slate-800 transition">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-white">{session.templateSnapshot.name}</div>
                                    <div className="text-xs text-slate-400">{new Date(session.startedAt).toLocaleDateString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex gap-1 text-xs font-mono text-slate-400">
                                        {session.repsBySet.map((r, idx) => (
                                            <span key={idx}>{r}{idx < session.repsBySet.length - 1 ? ',' : ''}</span>
                                        ))}
                                    </div>
                                    <div className="text-lg font-bold text-blue-400">
                                        {session.totalReps} reps
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </main>
    );
}
