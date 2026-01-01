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
                                    <div className="font-bold text-white">{session.templateSnapshot.name}</div>
                                    <div className="text-xs text-slate-400">{new Date(session.startedAt).toLocaleDateString()}</div>
                                </div >
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
                            </Link >
                        ))
                    )
}
                </div >
            </section >
        </main >
    );
}
