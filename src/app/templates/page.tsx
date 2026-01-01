"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTemplates, deleteTemplate, Template } from "@/lib/db";
import { ChevronLeft, Plus, Trash2, Edit } from "lucide-react";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await listTemplates();
            setTemplates(data);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this template?")) {
            await deleteTemplate(id);
            loadTemplates();
        }
    };

    if (loading) return <div className="text-white text-center p-10">Loading templates...</div>;

    return (
        <main className="min-h-screen p-6 pb-20 max-w-md mx-auto relative bg-[#0f172a]">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                        <ChevronLeft className="text-white" />
                    </Link>
                    <h1 className="text-xl font-bold text-white">Templates</h1>
                </div>
                <Link href="/templates/new" className="btn-primary p-2 rounded-xl flex items-center gap-2 text-sm px-4">
                    <Plus size={16} /> New
                </Link>
            </header>

            <div className="space-y-4">
                {templates.map((t) => (
                    <div key={t.id} className="glass-panel p-4 rounded-xl flex justify-between items-center bg-slate-800/50">
                        <div>
                            <div className="font-bold text-white text-lg">{t.name}</div>
                            <div className="text-sm text-slate-400 mt-1">
                                {t.sets} sets • {t.targetTotal} reps • {t.restSec}s rest
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/templates/edit?id=${t.id}`} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-blue-400">
                                <Edit size={18} />
                            </Link>
                            <button
                                onClick={() => handleDelete(t.id)}
                                className="p-2 bg-slate-700 rounded-lg hover:bg-red-500/20 text-red-400"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {templates.length === 0 && (
                    <div className="text-center text-slate-500 py-10">No templates found. Create one!</div>
                )}
            </div>
        </main>
    );
}
