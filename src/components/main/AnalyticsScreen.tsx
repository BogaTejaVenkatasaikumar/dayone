import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Flame, Award, Calendar, CheckSquare, Zap, Target, Library } from 'lucide-react';
import { progressApi } from '../../api';

export const AnalyticsScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    progressApi.get().then((data) => {
      setStats(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const streak = stats?.streakCount || 0;
  const totalXp = stats?.totalXp || 0;
  const level = stats?.currentLevel || 1;
  const overallPct = stats?.overallCompletionPct || 0;
  const velocity = stats?.weeklyVelocity || [0, 0, 0, 0, 0, 0, 0];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Calculate XP needed for next level (assuming 1000 XP per level)
  const xpInCurrentLevel = totalXp % 1000;
  const nextLevelXpNeeded = 1000 - xpInCurrentLevel;
  const levelProgressPct = (xpInCurrentLevel / 1000) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Cognitive Analytics Matrix</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Progress & Metrics</h2>
      </div>

      {loading ? (
        <div className="text-center py-24 text-on-surface-variant font-semibold">Scanning user progress data...</div>
      ) : (
        <div className="space-y-8">
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/15 text-tertiary flex items-center justify-center shadow-lg"><Flame size={24} fill="currentColor" /></div>
              <div>
                <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Active Streak</span>
                <span className="text-2xl font-black text-on-surface mt-1 block">{streak} Days</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-lg"><Award size={24} fill="currentColor" /></div>
              <div>
                <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Study Level</span>
                <span className="text-2xl font-black text-on-surface mt-1 block">Level {level}</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shadow-lg"><Zap size={24} fill="currentColor" /></div>
              <div>
                <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Accumulated XP</span>
                <span className="text-2xl font-black text-on-surface mt-1 block">{totalXp} XP</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary-container flex items-center justify-center shadow-lg"><Target size={24} /></div>
              <div>
                <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Completion Rate</span>
                <span className="text-2xl font-black text-on-surface mt-1 block">{overallPct}% Done</span>
              </div>
            </div>
          </div>

          {/* Level Up progress bar */}
          <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h4 className="font-headline font-bold text-lg text-on-surface">Level Progression</h4>
                <p className="text-xs text-on-surface-variant mt-1">{nextLevelXpNeeded} XP required to advance to Level {level + 1}</p>
              </div>
              <span className="text-sm font-bold text-primary">{xpInCurrentLevel} / 1000 XP</span>
            </div>
            <div className="h-4 w-full bg-surface-container-low rounded-full overflow-hidden border border-outline-variant/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgressPct}%` }} className="h-full bg-gradient-to-r from-primary to-primary-container shadow-[0_0_20px_rgba(77,142,255,0.3)]" />
            </div>
          </div>

          {/* Weekly velocity chart & calendar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Velocity Bar Chart */}
            <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
              <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                <BarChart size={20} className="text-primary" /> Weekly Study Velocity
              </h4>

              <div className="h-64 flex items-end justify-around pt-6 bg-surface-container-low rounded-2xl p-4 border border-outline-variant/5">
                {velocity.map((xp: number, index: number) => {
                  // Max height ratio based on max XP (say, 500 XP is 100%)
                  const maxHeight = 500;
                  const barHeightPct = Math.min((xp / maxHeight) * 100, 100);

                  return (
                    <div key={index} className="flex flex-col items-center gap-3 w-12 group">
                      <div className="relative w-full flex justify-center">
                        {/* Tooltip */}
                        <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-highest border border-outline-variant/10 text-on-surface text-[10px] font-semibold px-2 py-1 rounded shadow-md pointer-events-none">
                          {xp} XP
                        </span>
                        {/* Bar */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(barHeightPct, 6)}%` }}
                          className={`w-4 rounded-t-full transition-all ${xp > 0 ? 'bg-secondary' : 'bg-outline-variant/20'}`}
                          style={{ minHeight: '8px' }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{daysOfWeek[index]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak Grid Calendar */}
            <div className="md:col-span-1 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                  <Calendar size={20} className="text-tertiary" /> Daily Active Log
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Your consistency builds muscle memory. The dots below represent your active learning logs for the past 2 weeks.</p>
                
                {/* 14 day log dots */}
                <div className="grid grid-cols-7 gap-3 pt-4">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const isActive = i < streak; // mockup based on active streak
                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-secondary/15 border-secondary text-secondary shadow-lg shadow-secondary/5' : 'bg-surface-container-low border-outline-variant/5 text-on-surface-variant/30'}`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-4">Pace Rating: Optimized</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
