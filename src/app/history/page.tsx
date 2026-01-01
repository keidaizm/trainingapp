'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar as CalendarIcon, BarChart2, List, Filter } from 'lucide-react';
import { listSessions, listTemplates, Session, Template } from '@/lib/db';
import { format, parseISO, isSameDay } from 'date-fns';
import { CalendarView } from './CalendarView';
import { GraphView } from './GraphView';
import clsx from 'clsx';
import '../globals.css';

function HistoryListItem({ session }: { session: Session }) {
    return (
        <Link
            href={`/summary?id=${session.id}`}
            className="block bg-gray-800 p-4 rounded-2xl mb-3 border border-gray-700 hover:border-blue-500 transition-colors"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-white">{session.templateSnapshot.name}</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                    {format(parseISO(session.startedAt), 'MM/dd HH:mm')}
                </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
                <div>
                    <span className="text-gray-500">Total</span> {session.totalReps} <span className="text-xs">reps</span>
                </div>
                <div>
                    <span className="text-gray-500">Sets</span> {session.repsBySet.length}
                </div>
            </div>
        </Link>
    );
}

export default function HistoryPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & State
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'graph'>('list');
    const [filterTemplateId, setFilterTemplateId] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        Promise.all([listSessions(), listTemplates()]).then(([s, t]) => {
            // Sort sessions new -> old
            s.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            setSessions(s);
            setTemplates(t);
            setLoading(false);
        });
    }, []);

    // Filter Logic
    const filteredSessions = useMemo(() => {
        let res = sessions;

        // 1. Filter by Template
        if (filterTemplateId !== 'all') {
            res = res.filter(s => s.templateId === filterTemplateId);
        }

        // 2. Filter by Date (only for Calendar View logic if needed for list display below calendar)
        if (viewMode === 'calendar' && selectedDate) {
            res = res.filter(s => isSameDay(parseISO(s.startedAt), selectedDate));
        }

        return res;
    }, [sessions, filterTemplateId, viewMode, selectedDate]);

    // Derived state for graph
    const selectedTemplateName = templates.find(t => t.id === filterTemplateId)?.name || 'All Exercises';

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen p-6 pb-24">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <Link href="/" className="inline-flex items-center text-gray-400 mb-2 hover:text-white">
                        <ArrowLeft size={20} className="mr-1" /> Back
                    </Link>
                    <h1 className="text-2xl font-bold text-white">History</h1>
                </div>
            </header>

            {/* Controls */}
            <div className="bg-gray-800 p-2 rounded-2xl mb-6 border border-gray-700 shadow-sm">
                {/* View Switcher */}
                <div className="flex bg-gray-900 rounded-xl p-1 mb-3">
                    <button
                        onClick={() => setViewMode('list')}
                        className={clsx("flex-1 py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-all", viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white')}
                    >
                        <List size={16} /> List
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={clsx("flex-1 py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-all", viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white')}
                    >
                        <CalendarIcon size={16} /> Cal
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={clsx("flex-1 py-2 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-all", viewMode === 'graph' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white')}
                    >
                        <BarChart2 size={16} /> Graph
                    </button>
                </div>

                {/* Filter Dropdown */}
                <div className="flex items-center gap-2 px-1">
                    <Filter size={16} className="text-gray-400" />
                    <select
                        value={filterTemplateId}
                        onChange={(e) => setFilterTemplateId(e.target.value)}
                        className="bg-transparent text-sm w-full outline-none text-white py-1"
                    >
                        <option value="all" className="bg-gray-800">All Exercises</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id} className="bg-gray-800">{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4">

                {viewMode === 'list' && (
                    <div>
                        <p className="text-sm text-gray-500 mb-2">{filteredSessions.length} sessions found</p>
                        {filteredSessions.map(s => (
                            <HistoryListItem key={s.id} session={s} />
                        ))}
                    </div>
                )}

                {viewMode === 'calendar' && (
                    <div className="animate-in fade-in duration-300">
                        <CalendarView
                            sessions={filterTemplateId === 'all' ? sessions : sessions.filter(s => s.templateId === filterTemplateId)}
                            selectedDate={selectedDate}
                            onDateClick={setSelectedDate}
                        />
                        <div className="mt-6">
                            <h3 className="text-sm font-bold text-gray-400 mb-3 border-b border-gray-700 pb-1">
                                {selectedDate ? format(selectedDate, 'MMM dd') : 'Select a date'}
                            </h3>
                            {selectedDate && filteredSessions.length === 0 && (
                                <p className="text-gray-500 text-sm">No training on this day.</p>
                            )}
                            {filteredSessions.map(s => (
                                <HistoryListItem key={s.id} session={s} />
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'graph' && (
                    <div className="animate-in fade-in duration-300">
                        {filterTemplateId === 'all' ? (
                            <div className="text-center py-10 px-4 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                                <BarChart2 className="mx-auto text-gray-600 mb-2" size={32} />
                                <p className="text-gray-300 font-medium">Please select an exercise</p>
                                <p className="text-xs text-gray-500 mt-1">Select specific exercise from the filter above to see progress.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <GraphView
                                    sessions={filteredSessions}
                                    exerciseName={selectedTemplateName}
                                />

                                {/* Stats Summary */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="text-xs text-gray-500">Total Sessions</div>
                                        <div className="text-xl font-bold text-white">{filteredSessions.length}</div>
                                    </div>
                                    <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="text-xs text-gray-500">Peak Reps (Set)</div>
                                        <div className="text-xl font-bold text-green-400">
                                            {Math.max(...filteredSessions.map(s => Math.max(...(s.repsBySet || [0]))), 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
