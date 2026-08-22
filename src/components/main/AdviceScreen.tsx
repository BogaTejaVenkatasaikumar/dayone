import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Brain, Bolt, ArrowRight, Lightbulb, AlertTriangle, Terminal, Code2, 
  BarChart, Database, Zap, Lock, Flag, Star, Rocket, Search, PlayCircle, 
  BookOpen, Flame, Verified, Award 
} from 'lucide-react';
import { adviceApi } from '../../api';

export const AdviceScreen = () => {
  const [advice, setAdvice] = useState<any>(null);
  
  useEffect(() => {
    adviceApi.get().then(setAdvice).catch(() => { });
  }, []);

  const insight = advice?.coachInsight;
  const tips = advice?.smartTips || [];
  const mistakes = advice?.mistakes || [];

  const tipIconMap: Record<string, React.ElementType> = {
    terminal: Terminal,
    code: Code2,
    chart: BarChart,
    database: Database,
    zap: Zap,
    shield: Lock,
    flag: Flag,
    star: Star,
    rocket: Rocket,
    lightbulb: Lightbulb,
    'alert-triangle': AlertTriangle,
    brain: Brain,
    search: Search,
    'play-circle': PlayCircle,
    'book-open': BookOpen,
    flame: Flame,
    verified: Verified,
    lock: Lock,
    award: Award
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8 bg-surface-container rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[320px]">
            <div className="absolute top-0 right-0 p-12 opacity-10"><Brain size={120} /></div>
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full mb-6">
                <Bolt size={14} />
                <span className="font-bold text-[10px] uppercase tracking-widest">Daily Coach Insight</span>
              </div>
              <h2 className="font-headline text-3xl font-extrabold text-on-surface leading-tight mb-4 max-w-xl">
                "{insight?.quote || "The gap between knowledge and mastery is consistent, focused repetition."}"
              </h2>
              <p className="text-on-surface-variant text-lg max-w-lg">{insight?.analysis || 'Keep pushing to maintain your momentum.'}</p>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <button className="sprint-gradient text-on-primary-container rounded-xl font-bold tracking-tight flex items-center gap-2 active:scale-95 transition-transform px-5 py-2.5 text-sm">
                View Full Analysis<ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="md:col-span-4 bg-surface-container-low rounded-3xl p-8 flex flex-col justify-center border border-outline-variant/10">
            <span className="text-[11px] font-bold text-tertiary mb-2 uppercase tracking-widest">Skill Velocity</span>
            <div className="text-5xl font-headline font-black text-on-surface mb-2">{insight?.skillVelocity || '+5%'}</div>
            <p className="text-on-surface-variant text-sm mb-6">{insight?.retentionMessage || 'Building consistency.'}</p>
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-secondary w-3/4 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-headline text-xl font-bold flex items-center gap-3"><Lightbulb size={24} className="text-primary" />Smart Tips</h3>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">{tips.length} TIPS</span>
          </div>
          <div className="space-y-5">
            {tips.map((tip: any) => {
              const TipIcon = tipIconMap[tip.icon] || Lightbulb;
              return (
                <div key={tip.id} className="group bg-surface-container rounded-2xl p-6 transition-all hover:bg-surface-container-high">
                  <div className="flex gap-5">
                    <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <TipIcon size={24} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-lg mb-1">{tip.title}</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{tip.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-headline text-xl font-bold flex items-center gap-3"><AlertTriangle size={24} className="text-error" />Mistakes to Avoid</h3>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">PRIORITY: HIGH</span>
          </div>
          <div className="space-y-5">
            {mistakes.map((m: any) => {
              const MIcon = tipIconMap[m.icon] || Code2;
              return (
                <div key={m.id} className="bg-surface-container-low rounded-2xl p-6 border-l-4 border-error/40">
                  <div className="flex gap-5">
                    <div className="w-12 h-12 shrink-0 bg-error/10 rounded-xl flex items-center justify-center">
                      <MIcon size={24} className="text-error" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-lg mb-1">{m.title}</h4>
                      <p className="text-on-surface-variant text-sm leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
