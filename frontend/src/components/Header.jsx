import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Database,
  Trophy,
  MessageSquare,
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
}) {
  const tabs = [
    { id: 'data', label: '1. Data & Setup', icon: Database },
    { id: 'results', label: '2. AutoML Results', icon: Trophy },
    { id: 'chat', label: '3. AI Assistant', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0e1a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 shadow-glow-brand">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0a0e1a]">
              <span className="h-2 w-2 rounded-full bg-white opacity-80 animate-pulse" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-lg font-extrabold tracking-tight text-white">
                AutoML<span className="text-brand-400">Studio</span>
              </span>
              <span className="hidden rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-brand-300 uppercase tracking-widest sm:inline-block">
                Transparent ML
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Glass-Box Machine Learning & Explainable AI
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-[#111827]/70 p-1.5 shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 shadow-glow-brand"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Status Indicator Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>AI Ready</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="flex md:hidden border-t border-white/[0.06] bg-[#0c1222] px-2 py-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-[0.75rem] font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label.split('. ')[1] || tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
