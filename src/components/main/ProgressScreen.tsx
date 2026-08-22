import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Verified, Flame, Terminal, Lock } from 'lucide-react';
import { progressApi } from '../../api';

export const ProgressScreen = () => {
  const [progress, setProgress] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    progressApi.get().then(setProgress).catch(() => { });
    progressApi.getBadges().then(setBadges).catch(() => { });
  }, []);

  const overallPct = progress?.overallCompletionPct || 0;
  const velocity = progress?.weeklyVelocity || [40, 65, 50, 85, 95, 30, 20];
  const streak = progress?.streakCount || 0;
  const maxV = Math.max(...velocity, 1);

  const badgeIconMap: Record<string, React.ElementType> = { verified: Verified, flame: Flame, terminal: Terminal, lock: Lock };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">Performance Dashboard</p>
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight leading-none">Your Progress</h2>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low rounded-xl border-l-4 border-tertiary p-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Current Streak</span>
            <span className="font-headline text-3xl font-extrabold text-tertiary">🔥 {streak} Days</span>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-surface-container rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors"></div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-surface-container-highest relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <motion.circle 
                  initial={{ strokeDashoffset: 351.8 }} 
                  animate={{ strokeDashoffset: 351.8 * (1 - overallPct / 100) }} 
                  transition={{ duration: 1.5, ease: "easeOut" }} 
                  className="text-primary" 
                  cx="64" cy="64" fill="transparent" r="56" 
                  stroke="currentColor" strokeDasharray="351.8" strokeWidth="8" 
                />
              </svg>
              <span className="font-headline text-4xl font-extrabold text-on-surface">{overallPct}%</span>
            </div>
            <h3 className="mt-6 font-headline font-bold text-xl text-on-surface">Overall Completion</h3>
          </div>
        </div>

        <div className="md:col-span-8 bg-surface-container rounded-xl p-8 flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Weekly Velocity</h3>
              <p className="text-on-surface-variant text-sm">Tasks completed per day</p>
            </div>
          </div>
          <div className="flex items-end justify-between h-48 gap-2 md:gap-4 px-2">
            {velocity.map((h: number, i: number) => (
              <div key={i} className="flex flex-col items-center gap-3 w-full group">
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: `${(h / maxV) * 100}%` }} 
                  className={`w-full rounded-t-lg transition-colors ${i === 4 ? 'sprint-gradient shadow-[0_0_20px_rgba(77,142,255,0.3)]' : 'bg-surface-container-highest group-hover:bg-primary-container/40'}`} 
                />
                <span className={`text-[10px] ${i === 4 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-12 bg-surface-container-low rounded-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline font-bold text-xl text-on-surface">Mastery Badges</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
            {badges.map((badge: any) => {
              const BadgeIcon = badgeIconMap[badge.icon] || Lock;
              return (
                <div key={badge.id} className={`flex flex-col items-center text-center group cursor-pointer ${!badge.unlocked ? 'opacity-40 grayscale' : ''}`}>
                  <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 relative">
                    <BadgeIcon className={`${badge.color} text-4xl`} size={32} fill={badge.unlocked ? "currentColor" : "none"} />
                  </div>
                  <span className="text-xs font-bold text-on-surface">{badge.label}</span>
                  <span className="text-[10px] text-on-surface-variant">{badge.sub_text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
