"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Template } from "@/lib/db";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface TemplateFormProps {
    initialData?: Partial<Template>;
    onSubmit: (data: any) => Promise<void>;
    title: string;
}

export default function TemplateForm({ initialData, onSubmit, title }: TemplateFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        sets: initialData?.sets || 7,
        targetTotal: initialData?.targetTotal || 20,
        restSec: initialData?.restSec || 90,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
            router.push("/templates");
        } catch (error) {
            console.error(error);
            alert("Failed to save template");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen p-6 max-w-md mx-auto relative bg-[#0f172a]">
            <header className="flex items-center gap-4 mb-8">
                <Link href="/templates" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                    <ChevronLeft className="text-white" />
                </Link>
                <h1 className="text-xl font-bold text-white">{title}</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Template Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Weighted Pull-ups"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2">Sets</label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            required
                            value={formData.sets}
                            onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2">Target Reps</label>
                        <input
                            type="number"
                            min={1}
                            max={200}
                            required
                            value={formData.targetTotal}
                            onChange={(e) => setFormData({ ...formData, targetTotal: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Rest Time (seconds)</label>
                    <input
                        type="number"
                        min={10}
                        max={600}
                        required
                        value={formData.restSec}
                        onChange={(e) => setFormData({ ...formData, restSec: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg mt-8",
                        loading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Save size={20} />
                    {loading ? "Saving..." : "Save Template"}
                </button>
            </form>
        </main>
    );
}
