import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Lightbulb, AlertTriangle, ShieldAlert, Award, X, Sparkles } from 'lucide-react';
import { adviceApi, notificationsApi } from '../../api';

export const AICoachScreen = () => {
  const [advice, setAdvice] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    setLoading(true);
    try {
      // Fetch advice (tips/mistakes)
      const advData = await adviceApi.get();
      setAdvice(advData);

      // Fetch AI Mentor alerts
      const alertData = await notificationsApi.getMentorAlerts();
      setAlerts(alertData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDismissAlert = async (id: string) => {
    try {
      const ok = await notificationsApi.dismissMentorAlert(id);
      if (ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Cognitive Coaching Protocol</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">AI Coach Diagnostic</h2>
      </div>

      {/* AI Mentor Proactive Warnings / Notifications */}
      {alerts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-error">
            <ShieldAlert size={20} />
            <h3 className="font-headline font-bold text-lg text-on-surface">Urgent Mentor Directives</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-2xl border flex items-start justify-between gap-4 relative overflow-hidden ${alert.type === 'warning' ? 'bg-error/10 border-error/20 text-error' : alert.type === 'encouragement' ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-primary/10 border-primary/20 text-primary'}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {alert.type === 'warning' ? <ShieldAlert size={20} /> : alert.type === 'encouragement' ? <Award size={20} /> : <BrainCircuit size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-relaxed text-on-surface">{alert.message}</p>
                      <span className="text-[9px] uppercase tracking-widest font-bold opacity-60 mt-1 block">AI Mentor • Live Warning</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismissAlert(alert.id)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors self-start"
                  >
                    <X size={16} className="text-on-surface-variant" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Main Analysis Block */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2">
              <BrainCircuit size={22} className="text-primary" /> Cognitive Velocity Analysis
            </h4>
            <Sparkles size={18} className="text-primary animate-pulse" />
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl space-y-4">
            <h5 className="font-headline text-lg font-bold text-primary italic">Coach Directive</h5>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {advice?.coachInsight?.analysis || "We are tracking your pace daily. Stick to the roadmap objectives and ensure you complete mock assignments to reinforce concepts."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-high p-5 rounded-2xl border border-outline-variant/5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Retention Index</span>
              <p className="text-sm font-semibold text-on-surface mt-2">{advice?.coachInsight?.retentionMessage || "Review session pending"}</p>
            </div>
            <div className="bg-surface-container-high p-5 rounded-2xl border border-outline-variant/5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sprint Velocity</span>
              <p className="text-sm font-semibold text-on-surface mt-2">Steady - average day takes 1.2 sessions</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Daily Directive Quote</span>
            <blockquote className="text-xl font-headline font-bold italic leading-relaxed text-secondary">
              "{advice?.coachInsight?.quote || "Precision beats speed. Learn the fundamentals deeply."}"
            </blockquote>
          </div>
          <p className="text-xs text-on-surface-variant/70 border-t border-outline-variant/10 pt-4 mt-4">
            AI coaching is tailored to your learning pace and study schedule metrics.
          </p>
        </div>
      </section>

      {/* Tips and Mistakes list */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Smart Tips */}
        <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
          <h4 className="font-headline font-bold text-xl text-secondary flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            <Lightbulb size={20} /> Optimization Tips
          </h4>
          <div className="space-y-4">
            {advice?.smartTips?.map((tip: any) => (
              <div key={tip.id} className="flex gap-4 items-start">
                <div className="p-2 bg-secondary/15 rounded-xl text-secondary flex-shrink-0 mt-0.5"><Lightbulb size={16} /></div>
                <div>
                  <h5 className="font-semibold text-base text-on-surface">{tip.title}</h5>
                  <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{tip.content}</p>
                </div>
              </div>
            )) || <p className="text-sm text-on-surface-variant">No recommendations available yet.</p>}
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
          <h4 className="font-headline font-bold text-xl text-error flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            <AlertTriangle size={20} /> Cognitive Mistakes to Avoid
          </h4>
          <div className="space-y-4">
            {advice?.mistakes?.map((mistake: any) => (
              <div key={mistake.id} className="flex gap-4 items-start">
                <div className="p-2 bg-error/15 rounded-xl text-error flex-shrink-0 mt-0.5"><AlertTriangle size={16} /></div>
                <div>
                  <h5 className="font-semibold text-base text-on-surface">{mistake.title}</h5>
                  <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{mistake.content}</p>
                </div>
              </div>
            )) || <p className="text-sm text-on-surface-variant">No pitfalls logged yet.</p>}
          </div>
        </div>
      </section>
    </motion.div>
  );
};
