import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Sparkles, Brain, ChevronRight, LogOut, ArrowLeft, Edit3, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { userApi, roadmapApi } from '../../api';
import { AuthContext } from '../../context/AuthContext';

interface OnboardingScreenProps {
  onComplete: () => void;
}

// ─── Async Generation Screen ────────────────────────────────────────────────
type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function GeneratingScreen({
  jobId,
  goal,
  onComplete,
  onFail,
}: {
  jobId: string;
  goal: string;
  onComplete: () => void;
  onFail: () => void;
}) {
  const [status, setStatus] = useState<JobStatus>('PENDING');
  const [timedOut, setTimedOut] = useState(false);
  const startTime = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      // Check timeout
      if (Date.now() - startTime.current > MAX_POLL_DURATION_MS) {
        setTimedOut(true);
        return;
      }

      try {
        const result = await roadmapApi.getJobStatus(jobId);
        if (cancelled) return;
        setStatus(result.status);

        if (result.status === 'COMPLETED') {
          onComplete();
          return;
        }
        if (result.status === 'FAILED') {
          onFail();
          return;
        }
      } catch {
        // network blip — keep polling
      }

      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollRef.current = setTimeout(poll, 500);

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [jobId, onComplete, onFail]);

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Understanding your goal', done: status !== 'PENDING', active: status === 'PENDING' },
    { label: 'Planning your learning path', done: status === 'COMPLETED', active: status === 'PROCESSING' },
    { label: 'Building your curriculum', done: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[480px] flex flex-col items-center gap-8 text-center"
      >
        {/* Spinner */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-surface-container-highest" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain size={30} className="text-primary animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="font-headline text-2xl font-extrabold text-on-surface">
            Your roadmap is being created
          </h2>
          <p className="text-on-surface-variant text-sm">
            We're turning your goal into a personalized learning path.
          </p>
          <p className="text-primary font-headline font-bold text-base mt-1">{goal}</p>
        </div>

        {/* Step indicators */}
        <div className="w-full space-y-3 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 size={18} className="text-secondary flex-shrink-0" />
              ) : step.active ? (
                <Loader2 size={18} className="text-primary animate-spin flex-shrink-0" />
              ) : (
                <div className="w-[18px] h-[18px] rounded-full border-2 border-outline-variant/40 flex-shrink-0" />
              )}
              <span className={`text-sm font-semibold ${step.done ? 'text-secondary' : step.active ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Timeout message */}
        {timedOut && (
          <p className="text-xs text-on-surface-variant text-center leading-relaxed">
            Your roadmap is taking longer than expected.{' '}
            <strong className="text-on-surface">You can leave this page</strong> — your roadmap will be saved automatically when it's ready.
          </p>
        )}

        {!timedOut && (
          <p className="text-xs text-on-surface-variant/60">
            Usually takes 10–20 seconds. You can leave this page anytime.
          </p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Onboarding Component ──────────────────────────────────────────────
export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  // Modes:
  // 'specifier'      – direct manual goal input (default)
  // 'describe'       – natural language description textarea
  // 'review'         – editable AI-suggested goal
  // 'generating'     – async job polling screen
  // 'failed'         – job failed, retry prompt
  // 'manual-fallback'– bypass AI suggestion, type goal directly
  const [mode, setMode] = useState<'specifier' | 'describe' | 'review' | 'generating' | 'failed' | 'manual-fallback'>('specifier');

  // Direct goal input
  const [directGoal, setDirectGoal] = useState('');

  // Description flow
  const [description, setDescription] = useState('');
  const [suggestedGoal, setSuggestedGoal] = useState('');
  const [explanation, setExplanation] = useState('');
  const [editingGoal, setEditingGoal] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  // Manual fallback
  const [manualGoal, setManualGoal] = useState('');

  // Async roadmap job
  const [activeJobId, setActiveJobId] = useState('');
  const [finalGoal, setFinalGoal] = useState('');

  // Roadmap submission errors
  const [roadmapError, setRoadmapError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { logout } = useContext(AuthContext);

  const handleSuggestGoal = async () => {
    const cleanDesc = description.trim();
    if (cleanDesc.length < 10) {
      setSuggestionError('Please describe your aspirations in at least 10 characters.');
      return;
    }
    setSuggestionError('');
    setLoadingSuggestion(true);
    try {
      const res = await userApi.suggestGoal(cleanDesc);
      setSuggestedGoal(res.suggestedGoal);
      setEditingGoal(res.suggestedGoal);
      setExplanation(res.explanation);
      setMode('review');
    } catch (err: any) {
      setSuggestionError(err.message || 'Unable to generate a suggestion right now. Please try again.');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const startRoadmapGeneration = async (goal: string) => {
    const cleanGoal = goal.trim();
    if (cleanGoal.length < 5) {
      setRoadmapError('Please describe your goal in at least 5 characters.');
      return;
    }
    setRoadmapError('');
    setSubmitting(true);
    try {
      const { jobId } = await roadmapApi.createRoadmap(cleanGoal);
      setActiveJobId(jobId);
      setFinalGoal(cleanGoal);
      setMode('generating');
    } catch (err: any) {
      setRoadmapError(err.message || 'Could not start roadmap generation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Generating / polling screen ───────────────────────────────────────────
  if (mode === 'generating') {
    return (
      <GeneratingScreen
        jobId={activeJobId}
        goal={finalGoal}
        onComplete={onComplete}
        onFail={() => setMode('failed')}
      />
    );
  }

  // ── Failed screen ─────────────────────────────────────────────────────────
  if (mode === 'failed') {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] flex flex-col items-center gap-6 text-center"
        >
          <div className="w-14 h-14 rounded-[1.25rem] bg-error/15 flex items-center justify-center text-error text-2xl">
            ✕
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Something went wrong</h2>
            <p className="text-on-surface-variant text-sm">
              We couldn't create your roadmap this time. Your goal has been saved — you can try again.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => startRoadmapGeneration(finalGoal)}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Retrying...</> : <>Try again <ChevronRight size={18} /></>}
            </button>
            <button
              onClick={() => { setMode('specifier'); setRoadmapError(''); }}
              className="w-full py-3 rounded-2xl border border-outline-variant/20 text-on-surface-variant text-sm font-semibold hover:border-primary/40 hover:text-primary transition-all"
            >
              Change my goal
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

      {/* Sign out */}
      <button
        onClick={() => { logout(); window.location.reload(); }}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/10 text-on-surface-variant text-sm font-bold hover:text-error hover:border-error/30 hover:bg-error/10 transition-colors z-50"
      >
        <LogOut size={16} /> Sign out
      </button>

      <AnimatePresence mode="wait">

        {/* ── MODE 1: DIRECT GOAL SPECIFIER ── */}
        {mode === 'specifier' && (
          <motion.div
            key="specifier"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[540px] space-y-5"
          >
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-primary/15 text-primary mb-2">
                <Target size={28} />
              </div>
              <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
                What's your Goal?
              </h1>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Type exactly what you want to achieve, or let us help you figure it out.
              </p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-1 shadow-2xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={directGoal}
                  onChange={e => setDirectGoal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && directGoal.trim().length >= 5 && startRoadmapGeneration(directGoal)}
                  placeholder="e.g. Become a Full Stack Developer…"
                  className="w-full px-6 py-5 bg-transparent text-on-surface text-base font-semibold placeholder:text-outline-variant outline-none rounded-3xl pr-16"
                />
                <button
                  onClick={() => startRoadmapGeneration(directGoal)}
                  disabled={directGoal.trim().length < 5 || submitting}
                  className="absolute right-2 w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/30"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight size={20} />}
                </button>
              </div>
            </div>

            {roadmapError && (
              <p className="text-xs text-error text-center font-medium">{roadmapError}</p>
            )}

            <div className="text-center pt-2">
              <button
                onClick={() => { setMode('describe'); setDescription(''); setSuggestedGoal(''); setExplanation(''); setSuggestionError(''); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant text-sm font-semibold hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Sparkles size={14} className="text-primary" />
                Don't know your goal? Let us help
              </button>
            </div>
          </motion.div>
        )}

        {/* ── MODE 2: DESCRIBE ASPIRATIONS ── */}
        {mode === 'describe' && (
          <motion.div
            key="describe"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[540px] space-y-6"
          >
            <button
              onClick={() => setMode('specifier')}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-primary/15 text-primary mb-2">
                <Brain size={28} />
              </div>
              <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
                Describe your aspirations
              </h1>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Tell us what you're interested in, what you want to build, or where you want your career to go. We'll help turn your ideas into a clear learning goal.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-4 shadow-2xl">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 1000))}
                  placeholder="Example: I want to build websites, learn Python, and eventually work in AI."
                  disabled={loadingSuggestion}
                  rows={5}
                  aria-label="Aspirations description"
                  className="w-full bg-transparent text-on-surface text-sm font-semibold placeholder:text-outline-variant/60 outline-none resize-none"
                />
                <div className="text-right text-xs text-on-surface-variant/70 mt-2 font-mono">
                  {description.length} / 1000
                </div>
              </div>

              {suggestionError && (
                <div className="p-3.5 bg-error/10 border border-error/20 rounded-2xl flex flex-col gap-3">
                  <p className="text-xs text-error font-medium">{suggestionError}</p>
                  {!loadingSuggestion && (
                    <div className="flex gap-2.5">
                      <button onClick={handleSuggestGoal} className="px-3.5 py-1.5 rounded-lg bg-error/20 text-error hover:bg-error/30 text-xs font-bold transition-all">
                        Try again
                      </button>
                      <button
                        onClick={() => { setMode('manual-fallback'); setManualGoal(''); setRoadmapError(''); }}
                        className="px-3.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface text-xs font-bold transition-all"
                      >
                        Enter goal manually
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSuggestGoal}
                disabled={description.trim() === '' || loadingSuggestion}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100"
              >
                {loadingSuggestion ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /><span>Analyzing your aspirations...</span></>
                ) : (
                  <><span>Generate my goal</span><ChevronRight size={18} /></>
                )}
              </button>

              {loadingSuggestion && (
                <p className="text-xs text-center text-on-surface-variant animate-pulse font-medium">
                  Finding a learning goal that fits your interests.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── MODE 3: REVIEW SUGGESTED GOAL ── */}
        {mode === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-[540px] space-y-6"
          >
            <button
              onClick={() => setMode('describe')}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-secondary/15 text-secondary mb-1">
                <Sparkles size={26} />
              </div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-secondary font-headline">AI Suggested Goal</span>
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">Here's a goal we think fits you</h2>
              <p className="text-on-surface-variant text-sm">Based on what you described, we suggest:</p>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-headline">Your Goal</span>
                <Edit3 size={13} className="text-on-surface-variant" />
              </div>
              <input
                type="text"
                value={editingGoal}
                maxLength={150}
                onChange={e => setEditingGoal(e.target.value)}
                className="w-full bg-transparent text-on-surface font-headline font-bold text-lg outline-none placeholder:text-outline-variant"
                aria-label="Suggested learning goal"
              />
            </div>

            {explanation && (
              <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-headline">Why we suggested this</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">{explanation}</p>
              </div>
            )}

            {roadmapError && <p className="text-xs text-error font-medium">{roadmapError}</p>}

            <button
              onClick={() => startRoadmapGeneration(editingGoal)}
              disabled={editingGoal.trim().length < 5 || submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100"
            >
              {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Starting...</> : <>Build my roadmap <ChevronRight size={18} /></>}
            </button>
          </motion.div>
        )}

        {/* ── MODE 4: MANUAL FALLBACK ── */}
        {mode === 'manual-fallback' && (
          <motion.div
            key="manual-fallback"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[540px] space-y-6"
          >
            <button
              onClick={() => setMode('describe')}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-[1.25rem] bg-primary/15 text-primary mb-2">
                <Target size={28} />
              </div>
              <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
                Enter your Goal Manually
              </h1>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Describe the specific learning goal or title you want us to use to build your roadmap.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-container-low border border-outline-variant/15 rounded-3xl p-1 shadow-2xl">
                <input
                  type="text"
                  autoFocus
                  value={manualGoal}
                  onChange={e => setManualGoal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualGoal.trim().length >= 5 && startRoadmapGeneration(manualGoal)}
                  placeholder="e.g. Become a Python Developer…"
                  className="w-full px-6 py-5 bg-transparent text-on-surface text-base font-semibold placeholder:text-outline-variant outline-none rounded-3xl"
                />
              </div>
              {roadmapError && <p className="text-xs text-error font-medium">{roadmapError}</p>}
              <button
                onClick={() => startRoadmapGeneration(manualGoal)}
                disabled={manualGoal.trim().length < 5 || submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Starting...</> : <>Build my roadmap <ChevronRight size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
