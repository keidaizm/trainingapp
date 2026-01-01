import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Session } from '@/lib/db';
import { format, parseISO } from 'date-fns';

type Props = {
    sessions: Session[];
    exerciseName: string;
};

export function GraphView({ sessions, exerciseName }: Props) {
    // Prepare data for chart
    // Sort by date asc
    const data = sessions
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
        .map(session => {
            // Calculate metric: Max reps in any set? Or Total Volume?
            // Let's go with Total Reps for now as it's simple and shows volume work.
            // Or Max Reps in a single set (strength).
            // Let's show Total Reps.
            return {
                date: format(parseISO(session.startedAt), 'MM/dd'),
                fullDate: format(parseISO(session.startedAt), 'yyyy/MM/dd HH:mm'),
                totalReps: session.totalReps,
                // Calculate max reps in a single set
                maxReps: Math.max(...(session.repsBySet || [0]))
            };
        });

    if (data.length === 0) {
        return <div className="text-center text-gray-500 py-10">No data for this exercise</div>;
    }

    return (
        <div className="w-full h-64 bg-gray-900 rounded-lg p-2">
            <h3 className="text-center text-sm mb-2 text-gray-400">{exerciseName} Progress</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickMargin={10}
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        itemStyle={{ color: '#E5E7EB' }}
                        labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="totalReps"
                        name="Total Reps"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6' }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="maxReps"
                        name="Max Reps (Set)"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981' }}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="text-blue-400">● Total Reps</span>
                <span className="text-green-400">● Max Reps (Best Set)</span>
            </div>
        </div>
    );
}
