import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, CheckCircle2, Circle, Rocket, Zap, ShieldCheck,
  Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { roadmapApi, progressApi } from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { useDailyChecklist } from '../../hooks/useDailyChecklist';

interface HomeScreenProps {
  onNavigateTab?: (tab: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab }) => {
  const { user } = useContext(AuthContext);
  
  // Roadmap and overall progress states
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  // Daily Checklist custom hook
  const {
    missions,
    completedCount: checklistCompletedCount,
    totalCount: checklistTotalCount,
    totalXpReward,
    xpData,
    loading: checklistLoading,
    error: checklistError,
    completeMission,
    refresh: refreshChecklist
  } = useDailyChecklist(user);

  const loadRoadmapData = async () => {
    setLoadingRoadmap(true);
    setRoadmapError(null);
    try {
      const [roadmapRes, progressRes] = await Promise.allSettled([
        roadmapApi.getAll(),
        progressApi.get()
      ]);

      if (roadmapRes.status === 'fulfilled') {
        const mods = roadmapRes.value?.modules || (Array.isArray(roadmapRes.value) ? roadmapRes.value : []);
        setRoadmap(mods);
      } else {
        setRoadmapError('Failed to load roadmap course content.');
      }

      if (progressRes.status === 'fulfilled') {
        setProgress(progressRes.value);
      }
    } catch (err) {
      console.error('Error fetching roadmap data:', err);
      setRoadmapError('Something went wrong while loading your learning details.');
    } finally {
      setLoadingRoadmap(false);
    }
  };

  useEffect(() => {
    loadRoadmapData();
  }, []);

  const handleRetryAll = () => {
    loadRoadmapData();
    refreshChecklist();
  };

  const roadmapArray = Array.isArray(roadmap) ? roadmap : [];
  const activeDay = roadmapArray.flatMap((m: any) => m.days || []).find((d: any) => d.status === 'active');
  const completedCount = roadmapArray.flatMap((m: any) => m.days || []).filter((d: any) => d.status === 'completed').length;
  const totalDays = roadmapArray.flatMap((m: any) => m.days || []).length || 15;
  const overallPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  // Use values from custom hook's XP/Streak data primarily (reflects daily completion) and fall back to roadmap progress stats
  const streak = xpData ? xpData.currentStreak : (progress?.streakCount ?? 1);
  const totalXp = xpData ? xpData.totalXp : (progress?.totalXp ?? 900);
  const currentLevel = xpData ? xpData.level : (progress?.currentLevel ?? 1);
  const levelName = xpData ? xpData.levelName : 'Specialist';

  // Checklist stats
  const isChecklistComplete = checklistTotalCount > 0 && checklistCompletedCount === checklistTotalCount;
  const checklistPct = checklistTotalCount > 0 ? Math.round((checklistCompletedCount / checklistTotalCount) * 100) : 0;

  const handleCompleteActiveDay = async () => {
    if (!activeDay || completing) return;
    setCompleting(true);
    try {
      const res = await progressApi.completeDay(activeDay.id);
      if (res.ok) {
        await loadRoadmapData();
        refreshChecklist(); // Refresh checklist stats to sync up
      }
    } catch (err) {
      console.error('Failed to complete active day:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Loading skeleton screen
  if (loadingRoadmap || checklistLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 pb-12 animate-pulse w-full">
        {/* Sidebar skeleton (visible on desktop) */}
        <div className="hidden lg:flex flex-col items-center justify-between w-24 h-[550px] bg-surface-container/60 border border-outline-variant/10 rounded-2xl p-6">
          <div className="w-10 h-6 bg-outline-variant/20 rounded"></div>
          <div className="w-1.5 h-64 bg-outline-variant/10 rounded"></div>
          <div className="w-10 h-6 bg-outline-variant/20 rounded"></div>
        </div>
        
        {/* Mobile progress skeleton (visible on mobile) */}
        <div className="lg:hidden w-full h-16 bg-surface-container/60 border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-20 h-4 bg-outline-variant/20 rounded"></div>
          <div className="flex-1 h-1.5 bg-outline-variant/10 rounded"></div>
          <div className="w-10 h-4 bg-outline-variant/20 rounded"></div>
        </div>

        {/* Cards skeleton stack */}
        <div className="flex-1 space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface-container/60 border border-outline-variant/10 rounded-2xl p-8 space-y-4">
              <div className="h-6 bg-outline-variant/20 rounded w-1/4"></div>
              <div className="h-4 bg-outline-variant/15 rounded w-3/4"></div>
              <div className="h-4 bg-outline-variant/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state screen
  if (roadmapError || checklistError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface-container border border-outline-variant/10 rounded-2xl text-center space-y-6 max-w-lg mx-auto">
        <AlertCircle size={48} className="text-error" />
        <div className="space-y-2">
          <h3 className="font-headline font-bold text-xl text-on-surface">Dashboard Load Failed</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            We had trouble reaching the servers. Please check your network connection and try again.
          </p>
        </div>
        <button 
          onClick={handleRetryAll}
          className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.15 }} 
      className="flex flex-col lg:flex-row gap-8 pb-12 w-full"
    >
      {/* ─── 1. ORBIT PROGRESS TRACKER (Left Sidebar / Top Mobile Bar) ─── */}
      {/* Desktop Sidebar (lg screens) */}
      <aside 
        className="hidden lg:flex flex-col items-center justify-between w-24 h-[640px] bg-[#0c101b] border border-outline-variant/10 rounded-2xl py-8 px-4 shadow-xl select-none"
        aria-label="Orbit progress sidebar"
      >
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80 block leading-tight font-headline">
            Orbit
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80 block leading-tight font-headline">
            Progress
          </span>
        </div>

        {/* Vertical timeline rail */}
        <div 
          className="relative flex-1 w-full my-6 flex items-center justify-center"
          role="progressbar"
          aria-valuenow={overallPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall course syllabus completion: ${overallPct}%`}
        >
          {/* Vertical track line */}
          <div className="absolute w-1 h-full bg-[#1b1c31] rounded-full overflow-hidden">
            {/* Glowing filled part */}
            <div 
              className="absolute bottom-0 w-full bg-gradient-to-t from-primary/50 to-primary transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              style={{ height: `${overallPct}%` }}
            />
          </div>

          {/* Glowing Rocket ship thumb */}
          <div 
            className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-container border-2 border-[#1c223c] flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.6)] cursor-pointer hover:scale-105 transition-all duration-500 ease-out"
            style={{ bottom: `calc(${overallPct}% * 0.82 + 9%)` }}
          >
            <Rocket size={18} className="text-white transform -rotate-45" />
          </div>
        </div>

        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 block font-headline">
            Ground
          </span>
          <span className="text-sm font-black text-primary font-headline mt-1 block">
            {overallPct}%
          </span>
        </div>
      </aside>

      {/* Mobile/Tablet Horizontal Rail (lg:hidden) */}
      <header 
        className="lg:hidden w-full bg-[#0c101b] border border-outline-variant/10 rounded-2xl p-4 shadow-md select-none"
        aria-label="Orbit progress top bar"
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-headline">
              Orbit Progress
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-primary font-headline">
              {overallPct}% Ground to Orbit
            </span>
          </div>
        </div>

        {/* Horizontal progress rail */}
        <div 
          className="relative w-full h-8 flex items-center"
          role="progressbar"
          aria-valuenow={overallPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall course syllabus completion: ${overallPct}%`}
        >
          {/* Horizontal track line */}
          <div className="absolute h-1 w-full bg-[#1b1c31] rounded-full overflow-hidden">
            {/* Glowing filled track */}
            <div 
              className="absolute left-0 h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Sliding rocket ship */}
          <div 
            className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-container border-2 border-[#1c223c] flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all duration-500 ease-out"
            style={{ left: `calc(${overallPct}% * 0.82 + 9%)`, transform: 'translateX(-50%)' }}
          >
            <Rocket size={14} className="text-white transform rotate-45" />
          </div>
        </div>
      </header>

      {/* ─── MAIN HUB CONTENT (checklists and cards stack) ─── */}
      <div className="flex-1 space-y-6">
        
        {/* ─── 2. DAILY CHECKLIST CARD ─── */}
        <section 
          className="bg-[#0e1320] border border-outline-variant/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
          aria-labelledby="checklist-card-title"
        >
          {/* Subtle glow border */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Title Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div 
                className="w-5 h-5 rounded-full bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary"
                aria-hidden="true"
              >
                <Sparkles size={11} fill="currentColor" />
              </div>
              <h2 id="checklist-card-title" className="font-headline font-bold text-base text-on-surface uppercase tracking-wide">
                Daily Checklist
              </h2>
            </div>
            <div className="text-xs font-bold text-tertiary font-headline uppercase tracking-wide">
              +{totalXpReward} XP total
            </div>
          </div>

          {/* Checklist Missions Items */}
          <div className="space-y-2.5 mb-5" role="group" aria-label="Daily tasks list">
            {missions.map((mission, idx) => (
              <div 
                key={idx}
                onClick={() => !mission.completed && completeMission(idx)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  mission.completed 
                    ? 'bg-surface-container-high/20 border-outline-variant/5 opacity-60' 
                    : 'bg-[#121829] border-outline-variant/10 hover:border-primary/40 hover:shadow-sm'
                }`}
                role="checkbox"
                aria-checked={mission.completed}
                aria-label={`Task: ${mission.title}. Value: ${mission.xpReward} XP`}
                tabIndex={mission.completed ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    if (!mission.completed) completeMission(idx);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  {mission.completed ? (
                    <CheckCircle2 size={18} className="text-secondary flex-shrink-0" />
                  ) : (
                    <Circle size={18} className="text-outline-variant flex-shrink-0" />
                  )}
                  <span className={`text-xs font-semibold ${
                    mission.completed 
                      ? 'text-on-surface-variant/60 line-through' 
                      : 'text-on-surface'
                  }`}>
                    {mission.title}
                  </span>
                  {/* Screen reader state */}
                  <span className="sr-only">
                    {mission.completed ? 'completed' : 'in progress'}
                  </span>
                </div>
                <span className={`text-[11px] font-bold ${
                  mission.completed ? 'text-on-surface-variant/40' : 'text-primary'
                }`}>
                  +{mission.xpReward} XP
                </span>
              </div>
            ))}
          </div>

          {/* Glowing Green Progress Divider Line */}
          <div className="relative w-full h-1 bg-[#151b2d] rounded-full overflow-hidden mb-4" aria-hidden="true">
            <div 
              className="h-full bg-secondary shadow-[0_0_8px_#34D399] transition-all duration-300"
              style={{ width: `${checklistPct}%` }}
            />
          </div>

          {/* Footer stats bar */}
          <div className="flex items-center justify-between pt-1 border-t border-outline-variant/5">
            <div className="flex items-center gap-1.5 text-tertiary bg-tertiary/10 border border-tertiary/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-headline">
              <Flame size={12} fill="currentColor" className="text-tertiary" /> {streak} day streak
            </div>
            
            {isChecklistComplete && (
              <div 
                className="flex items-center gap-1 text-secondary text-[11px] font-bold font-headline uppercase tracking-wider"
                role="status"
              >
                <Sparkles size={12} /> Checklist complete
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. SYLLABUS PROGRESS CARD ─── */}
        <section 
          className="bg-[#0e1320] border border-outline-variant/10 rounded-2xl p-6 shadow-xl relative overflow-hidden"
          aria-labelledby="syllabus-card-title"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[90px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            
            {/* Left detailed analytics */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest border border-primary/20 font-headline">
                  Level {currentLevel} {levelName}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-[9px] font-bold uppercase tracking-widest border border-tertiary/20 flex items-center gap-1 font-headline">
                  <Flame size={10} fill="currentColor" /> {streak} Day Streak
                </span>
              </div>

              <h2 id="syllabus-card-title" className="font-headline text-2xl font-black text-on-surface tracking-tight lowercase">
                {user?.goal || 'ai engineer'}
              </h2>

              <p className="text-on-surface-variant text-xs leading-relaxed max-w-md">
                Target completion estimated in <span className="text-on-surface font-semibold">14 days</span>. You've mastered <span className="text-secondary font-bold">{completedCount} of {totalDays}</span> core curriculum topics.
              </p>

              <div className="pt-2 flex items-center gap-6">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/70 block leading-tight font-headline">Total Earned</span>
                  <span className="font-headline text-lg font-black text-tertiary flex items-center gap-1 mt-0.5">
                    <Zap size={14} fill="currentColor" /> {totalXp} XP
                  </span>
                </div>
                <div className="h-6 w-[1px] bg-outline-variant/10" aria-hidden="true" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/70 block leading-tight font-headline">Retention Score</span>
                  <span className="font-headline text-lg font-black text-secondary flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={14} /> 88%
                  </span>
                </div>
              </div>
            </div>

            {/* Right radial gauge progress indicator */}
            <div 
              className="flex-shrink-0 self-center p-4 bg-surface-container-high/10 border border-outline-variant/5 rounded-xl flex items-center justify-center shadow-inner"
              role="img"
              aria-label={`Overall syllabus progress ring at ${overallPct}%`}
            >
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="44" 
                    stroke="rgba(255, 255, 255, 0.03)" 
                    strokeWidth="8" 
                    fill="transparent" 
                  />
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="44" 
                    stroke="var(--color-secondary)" 
                    strokeWidth="8" 
                    strokeDasharray="276.4" 
                    strokeDashoffset={276.4 - (276.4 * overallPct) / 100} 
                    strokeLinecap="round" 
                    fill="transparent" 
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-xl font-black text-on-surface leading-none">{overallPct}%</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant mt-1.5">Syllabus</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── 4. TODAY'S CORE MISSION CARD ─── */}
        {activeDay ? (
          <section 
            className="bg-[#0e1320] border border-[#1d2538]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden"
            aria-labelledby="mission-card-title"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-outline-variant/5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 font-headline">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" /> Today's Core Mission
                </span>
                <h3 id="mission-card-title" className="font-headline text-lg font-extrabold text-on-surface">
                  {activeDay.task_name || activeDay.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onNavigateTab && onNavigateTab('practice')}
                  className="px-4 py-2 rounded-xl bg-[#141c2f] border border-outline-variant/10 text-xs font-bold text-on-surface hover:border-primary/40 transition-colors"
                  aria-label="Launch coding sandbox to practice"
                >
                  Launch sandbox
                </button>
                <button 
                  onClick={handleCompleteActiveDay}
                  disabled={completing}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-headline font-bold uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
                  aria-label={completing ? 'Saving roadmap progress' : 'Mark today\'s roadmap task complete'}
                >
                  {completing ? 'Saving...' : 'Mark complete'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
              <div className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/70 font-headline">Tool & Tech Stack</span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeDay.stack || 'TypeScript, React, Node.js').split(',').map((tool: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 rounded-lg bg-[#141b2c] text-xs font-semibold text-primary border border-primary/10"
                    >
                      {tool.trim()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/70 font-headline">Target Outcome</span>
                <p className="text-xs font-medium text-on-surface bg-[#0a0d18] p-3 rounded-xl border border-outline-variant/5">
                  {activeDay.expected_outcome || 'Build and verify an optimized functional code prototype.'}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section 
            className="bg-[#0e1320] border border-outline-variant/10 p-8 rounded-2xl text-center space-y-4 shadow-xl"
            aria-labelledby="complete-syllabus-title"
          >
            <CheckCircle2 size={40} className="text-secondary mx-auto" aria-hidden="true" />
            <h3 id="complete-syllabus-title" className="font-headline font-bold text-lg text-on-surface">
              All Syllabus Days Complete!
            </h3>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              You have completed all active modules. Adapt your roadmap to generate additional advanced topics or practice in the sandbox.
            </p>
          </section>
        )}

      </div>
    </motion.div>
  );
};
