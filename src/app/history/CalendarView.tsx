import React, { useMemo } from 'react';
import Calendar from 'react-calendar';
import { Session } from '@/lib/db';
import { isSameDay, parseISO } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import './calendar-override.css'; // We will create this for dark mode custom styles

type Props = {
    sessions: Session[];
    onDateClick: (date: Date) => void;
    selectedDate: Date | null;
};

export function CalendarView({ sessions, onDateClick, selectedDate }: Props) {

    // Create a Set of dates that have sessions for O(1) lookup
    const sessionDates = useMemo(() => {
        const dates = new Set<string>();
        sessions.forEach(s => {
            // Create YYYY-MM-DD string
            const d = parseISO(s.startedAt);
            dates.add(d.toDateString());
        });
        return dates;
    }, [sessions]);

    const tileContent = ({ date, view }: { date: Date; view: string }) => {
        if (view === 'month' && sessionDates.has(date.toDateString())) {
            return <div className="dot w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" />;
        }
        return null;
    };

    return (
        <div className="flex justify-center p-4">
            <Calendar
                onChange={(val) => {
                    if (val instanceof Date) onDateClick(val);
                }}
                value={selectedDate}
                tileContent={tileContent}
                className="bg-gray-800 text-white border-0 rounded-lg shadow-lg"
            />
        </div>
    );
}
