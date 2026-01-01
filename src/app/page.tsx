"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureDefaultTemplate, listTemplates, Template, createSessionFromTemplate } from "@/lib/db";
import { History, Target, X, Play, Clock, Repeat, Settings } from "lucide-react";
import clsx from "clsx";

export default function Home() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Config State
  const [configSets, setConfigSets] = useState(7);
  const [configRest, setConfigRest] = useState(90);

  useEffect(() => {
    const init = async () => {
      try {
        await ensureDefaultTemplate();
        const tpls = await listTemplates();
        setTemplates(tpls);
      } catch (e) {
        console.error("Failed to init", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const openConfig = (t: Template) => {
    setSelectedTemplate(t);
    setConfigSets(t.sets);
    setConfigRest(t.restSec);
  };

  const closeConfig = () => {
    setSelectedTemplate(null);
  };

  const handleStart = async () => {
    if (!selectedTemplate) return;
    // Create session immediately with overrides? 
    // Or pass params to workout page?
    // Better to create session ID here or pass params.
    // Workout page logic in `init` created the session. 
    // Let's modify workout page to accept params? Or create here?
    // Plan said: "Start Button: Creates session with these overrides."
    // So we create session here, then redirect to workout with sessionId?
    // Currently workout page expects `templateId` and CREATES a session.
    // We should update workout page to also accept `sessionId` OR modify DB logic.
    // Easiest: Create now, pass `sessionId`. But workout page logic needs update.
    // For now, let's keep it simple: Pass overrides as URL params?
    // Or: workout page looks for existing 'in-progress' session?

    // Let's update `workout/page.tsx` to read `sets` and `rest` query params? 
    // Or just create session here.
    try {
      const session = await createSessionFromTemplate(selectedTemplate.id, {
        sets: configSets,
        restSec: configRest // Assuming we add rest override support too
      });
      // Redirect to workout page with sessionId?
      // Existing workout page logic: `if (templateId) createSession`.
      // We should change workout page to `?sessionId=...` support OR `?templateId=...&sets=...`
      // Let's go with `?sessionId=...` - cleaner.
      // BUT - workout page logic currently creates a session.
      // I will update workout page next. Plan included "Update createSessionFromTemplate".
      // I'll assume I update workout page to support loading an EXISTING session ID by query param.
      router.push(`/workout?sessionId=${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Pre-defined order for the 4 presets if we want strict grid
  const order = ['tpl_wide', 'tpl_curl', 'tpl_narrow', 'tpl_dips', 'tpl_v_raise'];
  const sortedTemplates = [...templates].sort((a, b) => {
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <main className="min-h-screen p-4 pb-24 flex flex-col max-w-md mx-auto relative bg-[#0f172a]">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-white">Select Exercise</h1>
        <p className="text-slate-400 text-sm">Tap to configure and start</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sortedTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => openConfig(t)}
            className="aspect-square glass-panel rounded-2xl p-4 flex flex-col items-start justify-between relative group hover:bg-slate-800/80 transition-all border border-slate-700/50 hover:border-blue-500/50"
          >
            <div className="bg-blue-500/10 p-3 rounded-full text-blue-400 group-hover:scale-110 transition-transform">
              {/* Icon based on type? Simple generic for now */}
              <Target size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-white text-lg leading-tight mb-1">{t.name}</div>
              <div className="text-xs text-slate-400">{t.sets} Sets</div>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={20} className="text-blue-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f172a] to-transparent">
        <div className="max-w-md mx-auto flex gap-4">
          <Link href="/history" className="flex-1 btn-secondary rounded-xl p-3 flex flex-col items-center gap-1 text-xs">
            <History size={20} className="mb-1" />
            History
          </Link>
          <Link href="/templates" className="flex-1 btn-secondary rounded-xl p-3 flex flex-col items-center gap-1 text-xs">
            <Settings size={20} className="mb-1" />
            Templates
          </Link>
        </div>
      </div>

      {/* Config Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1e293b] rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-slate-700 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                <p className="text-sm text-slate-400">Setup Routine</p>
              </div>
              <button onClick={closeConfig} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              {/* Sets Input */}
              <div className="bg-slate-900/50 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Repeat className="text-blue-400" size={20} />
                  <span className="text-slate-300 font-bold">Sets</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setConfigSets(s => Math.max(1, s - 1))} className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xl hover:bg-slate-700">-</button>
                  <span className="text-2xl font-bold text-white tabular-nums min-w-[30px] text-center">{configSets}</span>
                  <button onClick={() => setConfigSets(s => Math.min(20, s + 1))} className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xl hover:bg-slate-700">+</button>
                </div>
              </div>

              {/* Rest Input (Optional/Advanced, maybe smaller?) */}
              <div className="bg-slate-900/50 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="text-green-400" size={20} />
                  <span className="text-slate-300 font-bold">Rest (sec)</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setConfigRest(s => Math.max(10, s - 10))} className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold hover:bg-slate-700">-</button>
                  <span className="text-xl font-bold text-white tabular-nums w-12 text-center">{configRest}</span>
                  <button onClick={() => setConfigRest(s => Math.min(600, s + 10))} className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold hover:bg-slate-700">+</button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full btn-primary py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20"
            >
              <Play fill="currentColor" size={20} /> START WORKOUT
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
