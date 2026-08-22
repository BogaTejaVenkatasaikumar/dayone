import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Zap, Flame, Shield, Star, Trophy, Unlock, Lock } from 'lucide-react';
import { progressApi } from '../../api';

// Achievement Definitions
const ACHIEVEMENTS = [
  { id: 'first_blood', title: 'First Blood', description: 'Complete your first syllabus day.', icon: Zap, threshold: { type: 'xp', value: 100 } },
  { id: 'streak_3', title: 'Momentum Builder', description: 'Reach a 3-day active study streak.', icon: Flame, threshold: { type: 'streak', value: 3 } },
  { id: 'streak_7', title: 'Consistency King', description: 'Reach a 7-day active study streak.', icon: Flame, threshold: { type: 'streak', value: 7 } },
  { id: 'xp_1000', title: 'Level 2 Scholar', description: 'Accumulate 1,000 Total XP.', icon: Award, threshold: { type: 'xp', value: 1000 } },
  { id: 'xp_5000', title: 'Knowledge Hoarder', description: 'Accumulate 5,000 Total XP.', icon: Award, threshold: { type: 'xp', value: 5000 } },
  { id: 'project_1', title: 'Builder', description: 'Submit and pass your first AI evaluated project.', icon: Shield, threshold: { type: 'xp', value: 500 } }, // Mocked via XP for simplicity
  { id: 'completion_50', title: 'Halfway There', description: 'Reach 50% overall syllabus completion.', icon: Trophy, threshold: { type: 'completion', value: 50 } },
  { id: 'completion_100', title: 'Mastery', description: 'Reach 100% overall syllabus completion.', icon: Star, threshold: { type: 'completion', value: 100 } },
];

export const AchievementsScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    progressApi.get().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const xp = stats?.totalXp || 0;
  const streak = stats?.streakCount || 0;
  const completionPct = stats?.overallCompletionPct || 0;
  const level = stats?.currentLevel || 1;

  const isUnlocked = (threshold: { type: string, value: number }) => {
    if (threshold.type === 'xp') return xp >= threshold.value;
    if (threshold.type === 'streak') return streak >= threshold.value;
    if (threshold.type === 'completion') return completionPct >= threshold.value;
    return false;
  };

  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a.threshold)).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Gamification Badges</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Achievements</h2>
      </div>

      {loading ? (
        <div className="text-center py-24 text-on-surface-variant font-semibold text-sm">Evaluating milestone conditions...</div>
      ) : (
        <div className="space-y-8">
          {/* Summary Header */}
          <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 space-y-2 text-center md:text-left">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full">Current Rank</span>
              <h3 className="font-headline font-extrabold text-3xl text-on-surface pt-2">Level {level} Scholar</h3>
              <p className="text-xs font-bold text-on-surface-variant flex items-center justify-center md:justify-start gap-1.5"><Zap size={14} className="text-primary" /> {xp} Total XP</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-surface-container-high flex items-center justify-center bg-surface-container shadow-inner mb-3">
                <span className="text-2xl font-black text-secondary">{unlockedCount}<span className="text-base text-on-surface-variant/50">/{ACHIEVEMENTS.length}</span></span>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Badges Unlocked</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = isUnlocked(ach.threshold);
              const Icon = ach.icon;

              return (
                <div key={ach.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center text-center gap-4 ${unlocked ? 'bg-surface-container border-secondary/30 shadow-lg hover:scale-[1.02]' : 'bg-surface-container-low border-outline-variant/5 opacity-60 grayscale'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${unlocked ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-high text-on-surface-variant/50'}`}>
                    <Icon size={32} />
                  </div>
                  <div>
                    <h5 className={`font-headline font-bold text-base mb-1 ${unlocked ? 'text-on-surface' : 'text-on-surface-variant'}`}>{ach.title}</h5>
                    <p className="text-[10px] text-on-surface-variant font-semibold leading-relaxed">{ach.description}</p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-outline-variant/5 w-full flex justify-center">
                    {unlocked ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-secondary uppercase tracking-widest"><Unlock size={12} /> Unlocked</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant uppercase tracking-widest"><Lock size={12} /> Locked</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};
