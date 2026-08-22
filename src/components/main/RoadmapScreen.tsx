import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, CheckCircle2, Flag, Star, Rocket, Brain, Award, Share2, 
  ArrowRight, ChevronDown, Lock, Target, Construction, Verified, X, LifeBuoy, Youtube,
  RefreshCw, Settings2, BookOpen, ExternalLink, GraduationCap, Video
} from 'lucide-react';
import { roadmapApi, progressApi, onboardingApi } from '../../api';
import { AuthContext } from '../../context/AuthContext';

// Static resource map: keyed on common topic keywords
const RESOURCE_MAP: Record<string, { books: string[]; courses: { name: string; url: string }[]; docs: string[] }> = {
  default: {
    books: ['Clean Code – Robert C. Martin', 'The Pragmatic Programmer – Hunt & Thomas'],
    courses: [
      { name: 'freeCodeCamp Full Course', url: 'https://www.freecodecamp.org' },
      { name: 'CS50 by Harvard (Free)', url: 'https://cs50.harvard.edu' },
    ],
    docs: ['MDN Web Docs', 'DevDocs.io'],
  },
  react: {
    books: ['Learning React – Alex Banks & Eve Porcello', 'Fullstack React – Accomazzo et al.'],
    courses: [
      { name: 'React – The Complete Guide (Udemy)', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/' },
      { name: 'React Docs (Official)', url: 'https://react.dev/learn' },
    ],
    docs: ['react.dev/learn', 'beta.reactjs.org'],
  },
  javascript: {
    books: ['You Don\'t Know JS – Kyle Simpson', 'Eloquent JavaScript – Marijn Haverbeke'],
    courses: [
      { name: 'JavaScript.info (Free)', url: 'https://javascript.info' },
      { name: 'The Odin Project JS Path', url: 'https://www.theodinproject.com/paths/full-stack-javascript' },
    ],
    docs: ['MDN JavaScript Reference', 'javascript.info'],
  },
  python: {
    books: ['Fluent Python – Luciano Ramalho', 'Automate the Boring Stuff – Al Sweigart (Free)'],
    courses: [
      { name: 'Python for Everybody (Coursera)', url: 'https://www.coursera.org/specializations/python' },
      { name: 'Real Python Tutorials', url: 'https://realpython.com' },
    ],
    docs: ['docs.python.org', 'realpython.com'],
  },
  algorithms: {
    books: ['Introduction to Algorithms – CLRS', 'Grokking Algorithms – Aditya Bhargava'],
    courses: [
      { name: 'Algorithms Part I & II (Princeton, Coursera)', url: 'https://www.coursera.org/learn/algorithms-part1' },
      { name: 'NeetCode Blind 75 (YouTube)', url: 'https://www.youtube.com/c/NeetCode' },
    ],
    docs: ['LeetCode Problems', 'VisuAlgo.net'],
  },
  node: {
    books: ['Node.js Design Patterns – Mario Casciaro', 'Node.js in Action – Cantelon et al.'],
    courses: [
      { name: 'The Complete Node.js Developer Course (Udemy)', url: 'https://www.udemy.com/course/the-complete-nodejs-developer-course-2/' },
      { name: 'NodeSchool.io (Free)', url: 'https://nodeschool.io' },
    ],
    docs: ['nodejs.org/en/docs', 'expressjs.com'],
  },
  sql: {
    books: ['Learning SQL – Alan Beaulieu', 'SQL Cookbook – Anthony Molinaro'],
    courses: [
      { name: 'SQL for Data Science (Coursera)', url: 'https://www.coursera.org/learn/sql-for-data-science' },
      { name: 'SQLZoo (Free Interactive)', url: 'https://sqlzoo.net' },
    ],
    docs: ['postgresql.org/docs', 'w3schools.com/sql'],
  },
  css: {
    books: ['CSS: The Definitive Guide – Eric Meyer', 'Every Layout – Heydon Pickering'],
    courses: [
      { name: 'Kevin Powell CSS on YouTube (Free)', url: 'https://www.youtube.com/kepowob' },
      { name: 'CSS Tricks A-Z Guide', url: 'https://css-tricks.com' },
    ],
    docs: ['MDN CSS Reference', 'css-tricks.com/almanac'],
  },
  typescript: {
    books: ['Programming TypeScript – Boris Cherny', 'Effective TypeScript – Dan Vanderkam'],
    courses: [
      { name: 'TypeScript Full Course (Matt Pocock, YouTube)', url: 'https://www.youtube.com/@mattpocockuk' },
      { name: 'Total TypeScript (Free Beginners)', url: 'https://www.totaltypescript.com/tutorials' },
    ],
    docs: ['typescriptlang.org/docs', 'typescript-cheatsheets.vercel.app'],
  },
  machine: {
    books: ['Hands-On Machine Learning – Aurélien Géron', 'Deep Learning – Goodfellow et al.'],
    courses: [
      { name: 'ML Specialization (Andrew Ng, Coursera)', url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
      { name: 'fast.ai Practical Deep Learning', url: 'https://www.fast.ai' },
    ],
    docs: ['scikit-learn.org', 'pytorch.org/tutorials'],
  },
};

function getResources(title: string, description: string) {
  const text = (title + ' ' + description).toLowerCase();
  for (const key of Object.keys(RESOURCE_MAP)) {
    if (key !== 'default' && text.includes(key)) {
      return RESOURCE_MAP[key];
    }
  }
  return RESOURCE_MAP.default;
}

export const RoadmapScreen = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [stuckData, setStuckData] = useState<any>(null);
  const { user } = useContext(AuthContext);
  const [progress, setProgress] = useState<any>(null);

  // Adapt Roadmap State
  const [adaptModalOpen, setAdaptModalOpen] = useState(false);
  const [adaptFeedback, setAdaptFeedback] = useState('');
  const [adapting, setAdapting] = useState(false);

  // Mission & Circuit Interactive States
  const [ignitingDayId, setIgnitingDayId] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('');
  const [isShaking, setIsShaking] = useState(false);
  const [isRocketLaunching, setIsRocketLaunching] = useState(false);

  const gridWrapRef = useRef<HTMLDivElement>(null);
  const pathSvgRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStuckLoading(false);
    setStuckData(null);
  }, [selectedDay]);

  const handleStuck = async () => {
    if (!selectedDay) return;
    setStuckLoading(true);
    try {
      const resp = await roadmapApi.getStuckHelp(selectedDay.id);
      setStuckData(resp);
    } catch (e) {
      console.error(e);
    }
    setStuckLoading(false);
  };

  const handleLinkedInShare = () => {
    const text = `I just finished tracking my 100% completion roadmap on DayOne! Mastered: ${roadmapData?.goal || user?.goal} 🚀`;
    if (navigator.share) {
      navigator.share({ title: 'Mastery Achieved', text, url: 'https://dayone.app' }).catch(console.error);
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=https://dayone.app`, '_blank');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    roadmapApi.getAll().then((data) => {
      const mods = data?.modules || (Array.isArray(data) ? data : []);
      setModules(mods);
      setRoadmapData(data);
      if (mods.length > 0) setExpandedModuleId(prev => prev ?? mods[0].id);
    }).catch((err) => {
      console.error('Roadmap fetch error:', err);
    }).finally(() => setLoading(false));
    progressApi.get().then(setProgress).catch(() => { });
  };

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adaptFeedback.trim() || adapting) return;

    setAdapting(true);
    try {
      const res = await onboardingApi.adaptRoadmap(adaptFeedback);
      if (res.ok) {
        setAdaptModalOpen(false);
        setAdaptFeedback('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
    setAdapting(false);
  };

  const handleDayClick = (day: any) => {
    setSelectedDay(day);
  };

  // Calculate Overall Progress Metrics across all syllabus days
  const allDays = modules.flatMap((m: any) => m.days || []);
  const totalDays = allDays.length || 15;
  const completedCount = allDays.filter((d: any) => d.status === 'completed').length;
  const overallPct = Math.round((completedCount / totalDays) * 100);
  const remainingDays = totalDays - completedCount;

  // Altitude labels
  const altLabels = ["GROUND", "25%", "50%", "75%", "ORBIT"];

  // Burst spark particle effect
  const spawnSparks = (x: number, y: number) => {
    for (let k = 0; k < 12; k++) {
      const sp = document.createElement('div');
      sp.className = 'spark';
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 45;
      sp.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      sp.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      sp.style.left = `${x}px`;
      sp.style.top = `${y}px`;
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  };

  // Trigger Stage Launch / Energize Day
  const handleEnergizeStage = async (day: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (ignitingDayId === day.id || day.status === 'completed') return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2);

    setIgnitingDayId(day.id);
    const countdownSeq = ['T-3', 'T-2', 'T-1', 'IGNITION'];
    let step = 0;
    setCountdownText(countdownSeq[0]);

    const interval = setInterval(async () => {
      step++;
      if (step < countdownSeq.length) {
        setCountdownText(countdownSeq[step]);
      } else {
        clearInterval(interval);

        // Rocket & Screen Shake effects
        setIsRocketLaunching(true);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // Spawn Booster separation piece & separation flash text
        if (trackRef.current) {
          const booster = document.createElement('div');
          booster.className = 'booster';
          booster.style.bottom = `${overallPct}%`;
          trackRef.current.appendChild(booster);

          const flash = document.createElement('div');
          flash.className = 'sep-flash';
          flash.style.bottom = `${overallPct}%`;
          flash.textContent = 'STAGE SEP';
          trackRef.current.appendChild(flash);

          setTimeout(() => {
            booster.remove();
            flash.remove();
          }, 1050);
        }

        try {
          const res = await progressApi.completeDay(day.id);
          if (res.ok) {
            fetchData();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsRocketLaunching(false);
          setIgnitingDayId(null);
          setCountdownText('');
        }
      }
    }, 400);
  };

  // 3D Card Tilt on Hover
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(0)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg)';
  };

  // Draw Circuit SVG Bezier lines connecting day nodes inside expanded module
  const drawCircuitPaths = () => {
    if (!gridWrapRef.current || !pathSvgRef.current) return;
    const wrapRect = gridWrapRef.current.getBoundingClientRect();
    const svg = pathSvgRef.current;
    
    svg.setAttribute('width', `${wrapRect.width}`);
    svg.setAttribute('height', `${wrapRect.height}`);
    svg.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);

    const existingSegs = svg.querySelectorAll('.seg');
    existingSegs.forEach(s => s.remove());
    
    const existingDots = gridWrapRef.current.querySelectorAll('.pulse-dot');
    existingDots.forEach(d => d.remove());

    const dayElements = Array.from(gridWrapRef.current.querySelectorAll('.ic-day-card'));
    if (dayElements.length < 2) return;

    const points = dayElements.map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left - wrapRect.left + 20, y: r.top - wrapRect.top + 20 };
    });

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const midX = (prev.x + cur.x) / 2;
      const pathD = `M ${prev.x} ${prev.y} C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;

      const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      seg.setAttribute('d', pathD);
      seg.setAttribute('class', 'seg lit');
      svg.appendChild(seg);

      const dot = document.createElement('div');
      dot.className = 'pulse-dot';
      dot.style.offsetPath = `path('${pathD}')`;
      dot.style.animationDelay = `-${i * 0.4}s`;
      gridWrapRef.current.appendChild(dot);
    }
  };

  useEffect(() => {
    drawCircuitPaths();
    window.addEventListener('resize', drawCircuitPaths);
    return () => window.removeEventListener('resize', drawCircuitPaths);
  }, [expandedModuleId, modules]);

  const iconMap: Record<string, React.ElementType> = { flag: Flag, star: Star, rocket: Rocket };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.15 }} 
      className={`space-y-10 relative ${isShaking ? 'shake' : ''}`}
    >
      {/* Dynamic Circuit Grid Backdrop & Scanbeam */}
      <div className="grid-bg" />
      <div className="scanbeam" />
      <div className="glow-planet" />

      {/* Header Section */}
      <section className="relative z-10 border-b border-outline-variant/15 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.2em] text-cyan font-bold uppercase bg-cyan/10 px-3 py-1 rounded-md border border-cyan/20">
                MISSION 01 · LAUNCH & CIRCUIT SEQUENCE
              </span>
              {roadmapData?.estimated_time && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-tertiary uppercase tracking-wider bg-tertiary/10 px-3 py-1 rounded-full border border-tertiary/20">
                  <Flame size={12} fill="currentColor" /> {roadmapData.estimated_time}
                </span>
              )}
            </div>

            <h1 className="font-headline font-black text-3xl sm:text-5xl text-on-surface tracking-tight">
              {roadmapData?.goal || user?.goal || "Idea Generation & Validation"}
            </h1>

            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              Master your craft through our rocket launch and high-voltage circuit execution framework. Every completed stage burns clean and pushes your skills higher into orbit.
            </p>


          </div>

          <div className="flex flex-col sm:items-end gap-4 w-full sm:w-auto">
            {/* Status Altitude Panel */}
            <div className="w-full sm:w-auto bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-4 px-6 text-left sm:text-right font-mono min-w-[170px] shadow-xl flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2">
              <div className="text-[10px] tracking-[0.16em] text-on-surface-variant/70 uppercase font-bold">ALTITUDE / PROGRESS</div>
              <div className="text-3xl font-extrabold text-cyan flex items-center justify-end gap-1">
                {overallPct}%
              </div>
            </div>

            <button
              onClick={() => setAdaptModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-surface-container border border-outline-variant/15 text-on-surface hover:border-primary/40 font-headline font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
            >
              <Settings2 size={16} className="text-primary" /> Adapt Syllabus
            </button>
          </div>
        </div>
      </section>

      {/* Adapt Roadmap Modal */}
      <AnimatePresence>
        {adaptModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setAdaptModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-surface-container-low rounded-[2rem] p-8 relative shadow-2xl border border-outline-variant/10"
            >
              <button
                onClick={() => setAdaptModalOpen(false)}
                className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <RefreshCw size={24} />
                </div>
                <h3 className="font-headline font-bold text-2xl text-on-surface">Adapt Roadmap</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Is the syllabus too fast, too slow, or missing topics you care about? Tell our AI engine to dynamically rewrite your upcoming modules while preserving your current progress.
                </p>

                <form onSubmit={handleAdapt} className="pt-4 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Your Feedback</label>
                    <textarea
                      className="w-full p-4 rounded-xl bg-surface-container-high border-none text-on-surface outline-none text-xs font-semibold resize-none h-24"
                      placeholder="e.g. I already know basics, make it harder. / I am struggling with pointers, give me more practice days."
                      value={adaptFeedback}
                      onChange={e => setAdaptFeedback(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adapting || !adaptFeedback.trim()}
                    className="w-full py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {adapting ? 'Re-compiling Syllabus...' : 'Apply Changes'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 100% Orbit Completion Banner */}
      {progress?.overallCompletionPct === 100 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-secondary/10 to-primary/10 border-2 border-secondary/50 rounded-[2rem] p-8 text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-20" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-secondary/10">
              <Award size={48} className="text-secondary" />
            </div>
            <h3 className="font-headline text-4xl font-black text-on-surface tracking-tighter">TARGET ORBIT REACHED — MISSION COMPLETE!</h3>
            <p className="text-on-surface-variant text-lg font-medium mt-2">You've successfully completed your goal: <span className="text-secondary">"{roadmapData?.goal || user?.goal}"</span></p>

            {roadmapData?.revision_topics?.length > 0 && (
              <div className="mt-8 pt-8 border-t border-outline-variant/10 text-left max-w-md mx-auto">
                <h4 className="font-headline font-bold text-xl text-primary mb-4 flex items-center gap-2">
                  <Brain size={24} /> Topics to Revise
                </h4>
                <ul className="space-y-3">
                  {roadmapData.revision_topics.map((topic: string, i: number) => (
                    <li key={topic} className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">{i + 1}</span>
                      <span className="text-sm font-semibold text-on-surface">{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <button
                onClick={handleLinkedInShare}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0a66c2] text-white font-headline font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Share2 size={20} /> Share My Victory
              </button>
              <button
                onClick={() => (window as any).setAppState('onboarding')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary text-on-secondary font-headline font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-3"
              >
                Master Another Skill <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Mission Grid with Sticky Rocket Track (Left) and Circuit Module Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Sticky Launch Track (Rocket Rail) */}
        <div className="col-span-1 lg:col-span-3 static lg:sticky lg:top-24 self-start w-full">
          <div className="bg-surface-container-low/90 backdrop-blur-md p-6 rounded-3xl border border-outline-variant/15 shadow-xl flex flex-col items-center space-y-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
              LAUNCH TRACK
            </div>

            <div className="relative h-[210px] sm:h-[240px] lg:h-[440px] w-16" ref={trackRef}>
              {/* Rail */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-repeating-linear-gradient(180deg,rgba(148,163,184,0.15)_0_6px,transparent_6px_12px)" />

              {/* Ticks */}
              {altLabels.map((label, idx) => {
                const tickPct = (idx / (altLabels.length - 1)) * 100;
                const isPassed = overallPct >= tickPct - 0.5;
                return (
                  <div
                    key={label}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
                    style={{ bottom: `${tickPct}%` }}
                  >
                    <span className={`w-2.5 h-[2px] transition-all ${isPassed ? 'bg-cyan shadow-[0_0_8px_rgba(73,224,240,0.8)]' : 'bg-outline-variant/30'}`} />
                    <span className={`font-mono text-[9px] tracking-wider whitespace-nowrap ${isPassed ? 'text-cyan font-bold' : 'text-on-surface-variant/50'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}

              {/* Animated Rocket */}
              <div
                className={`rocket-wrap absolute left-1/2 -translate-x-1/2 translate-y-1/2 transition-all duration-1000 ease-out ${isRocketLaunching ? 'igniting' : ''}`}
                style={{ bottom: `${overallPct}%` }}
              >
                <svg className="w-8 h-20" viewBox="0 0 40 100" fill="none">
                  <path d="M20 2C28 16 30 30 30 46H10C10 30 12 16 20 2Z" fill="#e7ebf6"/>
                  <path d="M20 2C24 16 26 30 26 46H14C14 30 16 16 20 2Z" fill="#c7cfe0"/>
                  <circle cx="20" cy="30" r="5" fill="#6fd3ff" opacity="0.85"/>
                  <path d="M10 46 2 62H10Z" fill="#9aa3ba"/>
                  <path d="M30 46 38 62H30Z" fill="#9aa3ba"/>
                  <rect x="12" y="44" width="16" height="10" fill="#c7cfe0"/>
                  <g className="flame">
                    <path d="M15 56 L20 90 L25 56Z" fill="#ff6a3d"/>
                    <path d="M17.5 56 L20 78 L22.5 56Z" fill="#ffd27a"/>
                  </g>
                </svg>
              </div>
            </div>

            {/* Orbit Target Banner */}
            <div className={`w-full py-3 px-3 rounded-xl border text-center font-mono text-[10px] tracking-widest transition-all ${
              remainingDays === 0
                ? 'bg-secondary/15 border-secondary/40 text-secondary font-bold shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'bg-surface-container/60 border-outline-variant/20 text-on-surface-variant'
            }`}>
              {remainingDays === 0
                ? 'ORBIT REACHED — COMPLETE'
                : `ORBIT — ${remainingDays} STAGE${remainingDays === 1 ? '' : 'S'} LEFT`}
            </div>
          </div>
        </div>

        {/* Right Content Column (Module Accordions & IC-Chip Day Cards Grid) */}
        <div className="lg:col-span-9 space-y-8 relative" ref={gridWrapRef}>
          <svg className="path-svg" ref={pathSvgRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}>
            <defs>
              <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c6df2" />
                <stop offset="100%" stopColor="#49e0f0" />
              </linearGradient>
            </defs>
          </svg>


          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-widest">Loading mission data...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && modules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Rocket size={40} className="text-primary" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-2xl text-on-surface">No Roadmap Generated Yet</h3>
                <p className="text-on-surface-variant text-sm mt-2 max-w-sm">Complete the onboarding flow to generate your personalized AI learning path.</p>
              </div>
            </div>
          )}

          {modules.map((mod: any, mi: number) => {
            const ModIcon = iconMap[mod.icon] || Flag;
            const isExpanded = expandedModuleId === mod.id;
            const modDays = mod.days || [];
            const modCompleted = modDays.every((d: any) => d.status === 'completed');
            const modActive = modDays.some((d: any) => d.status === 'active');

            return (
              <div
                key={mod.id}
                className={`bg-surface-container/80 backdrop-blur-md rounded-3xl border transition-all overflow-hidden ${
                  isExpanded ? 'border-primary/40 shadow-2xl' : 'border-outline-variant/15 hover:border-outline-variant/30'
                }`}
              >
                {/* Module Accordion Header */}
                <div
                  onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                  className="p-6 cursor-pointer flex items-center justify-between gap-4 group bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-low"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      modCompleted
                        ? 'bg-secondary/20 text-secondary border border-secondary/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                        : isExpanded
                        ? 'sprint-gradient text-white shadow-lg shadow-primary/20'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      <ModIcon size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                          STAGE MODULE {String(mi + 1).padStart(2, '0')}
                        </span>
                        {mod.duration && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-tertiary uppercase tracking-wider bg-tertiary/10 px-2.5 py-0.5 rounded-full border border-tertiary/20">
                            <Flame size={10} fill="currentColor" /> {mod.duration}
                          </span>
                        )}
                      </div>
                      <h3 className="font-headline font-bold text-xl sm:text-2xl text-on-surface mt-0.5 group-hover:text-primary transition-colors">
                        {mod.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] tracking-widest font-bold px-3 py-1 rounded-full border ${
                      modCompleted
                        ? 'bg-secondary/10 border-secondary/30 text-secondary'
                        : modActive
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-container-high border-outline-variant/20 text-on-surface-variant/60'
                    }`}>
                      {modCompleted ? 'COMPLETE' : modActive ? 'READY' : 'STANDBY'}
                    </span>
                    <ChevronDown size={20} className={`text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                  </div>
                </div>

                {/* Module Body Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 pt-2 border-t border-outline-variant/10 space-y-6"
                    >
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {mod.description}
                      </p>

                      {mod.tools && (() => {
                        try {
                          const toolList = typeof mod.tools === 'string' ? JSON.parse(mod.tools) : mod.tools;
                          return Array.isArray(toolList) ? (
                            <div className="flex flex-wrap gap-2">
                              {toolList.map((tool: string) => (
                                <span key={tool} className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          ) : null;
                        } catch { return null; }
                      })()}

                      {/* IC-Chip Day Cards 2-Column Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {modDays.map((day: any) => {
                          const isCompleted = day.status === 'completed';
                          const isActive = day.status === 'active';
                          const isIgniting = ignitingDayId === day.id;

                          return (
                            <div
                              key={day.id}
                              onClick={() => handleDayClick(day)}
                              onMouseMove={handleCardMouseMove}
                              onMouseLeave={handleCardMouseLeave}
                              className={`ic-day-card relative rounded-2xl p-6 transition-all duration-300 cursor-pointer overflow-hidden ${
                                isCompleted
                                  ? 'bg-surface-container-low border border-secondary/40 shadow-[0_0_20px_rgba(52,211,153,0.1)]'
                                  : isActive
                                  ? 'bg-surface-container border border-primary/50 shadow-[0_16px_36px_rgba(139,92,246,0.2)]'
                                  : 'bg-surface-container-low/50 border border-outline-variant/10 opacity-70 grayscale-[0.4] hover:grayscale-0 hover:opacity-100'
                              }`}
                            >
                              {/* Side IC-Chip Pins */}
                              <div className="pins left absolute top-4 bottom-4 left-[-4px] w-2 flex flex-col justify-between pointer-events-none">
                                {[1, 2, 3, 4].map(p => (
                                  <span key={p} className={`w-2 h-[2px] rounded-sm transition-colors ${
                                    isCompleted ? 'bg-secondary shadow-[0_0_6px_rgba(52,211,153,0.8)]' : isActive ? 'bg-primary shadow-[0_0_6px_rgba(139,92,246,0.8)]' : 'bg-outline-variant/30'
                                  }`} />
                                ))}
                              </div>
                              <div className="pins right absolute top-4 bottom-4 right-[-4px] w-2 flex flex-col justify-between pointer-events-none">
                                {[1, 2, 3, 4].map(p => (
                                  <span key={p} className={`w-2 h-[2px] rounded-sm transition-colors ${
                                    isCompleted ? 'bg-secondary shadow-[0_0_6px_rgba(52,211,153,0.8)]' : isActive ? 'bg-primary shadow-[0_0_6px_rgba(139,92,246,0.8)]' : 'bg-outline-variant/30'
                                  }`} />
                                ))}
                              </div>

                              {/* Card Header */}
                              <div className="flex items-center justify-between mb-3">
                                <span className={`font-mono text-[11px] font-bold tracking-widest ${
                                  isCompleted ? 'text-secondary' : isActive ? 'text-cyan' : 'text-on-surface-variant/60'
                                }`}>
                                  DAY {String(day.day_number).padStart(2, '0')}
                                </span>

                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full border border-secondary/30">
                                    <CheckCircle2 size={12} /> DONE
                                  </span>
                                ) : isActive ? (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-cyan bg-cyan/10 px-2.5 py-1 rounded-full border border-cyan/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" /> ACTIVE
                                  </span>
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-on-surface-variant/50">
                                    <Lock size={12} />
                                  </div>
                                )}
                              </div>

                              {/* Title & Description */}
                              <h4 className={`font-headline font-bold text-lg mb-2 text-on-surface group-hover:text-primary transition-colors ${
                                !isCompleted && !isActive ? 'filter blur-[1.5px] opacity-60' : ''
                              }`}>
                                {day.title}
                              </h4>

                              <p className={`text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4 ${
                                !isCompleted && !isActive ? 'filter blur-[1px] opacity-50' : ''
                              }`}>
                                {day.description}
                              </p>

                              {/* Footer Action / Status */}
                              {isActive && (
                                <div className="mt-4 pt-4 border-t border-outline-variant/10 space-y-3">
                                  <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
                                    <span>STAGE IGNITION & ENERGIZE</span>
                                    {isIgniting && <span className="text-flame font-bold animate-pulse">{countdownText}</span>}
                                  </div>

                                  <button
                                    onClick={(e) => handleEnergizeStage(day, e)}
                                    disabled={isIgniting}
                                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan via-primary to-primary-container text-white font-headline font-bold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    <Flame size={15} className="text-tertiary animate-bounce" />
                                    {isIgniting ? `Countdown ${countdownText}...` : '🔥 Ignite Stage'}
                                  </button>
                                </div>
                              )}

                              {isCompleted && (
                                <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center gap-2 font-mono text-[11px] text-secondary">
                                  <CheckCircle2 size={14} /> Stage complete — booster separated
                                </div>
                              )}

                              {!isCompleted && !isActive && (
                                <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center gap-2 font-mono text-[10px] text-on-surface-variant/50">
                                  <span>◌ Awaiting previous stage separation</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {roadmapData?.revision_topics?.length > 0 && (progress?.overallCompletionPct || 0) < 100 && (
            <div className="bg-surface-container-low/80 backdrop-blur-md p-6 rounded-3xl border border-outline-variant/15 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-tertiary/15 flex items-center justify-center text-tertiary border border-tertiary/20">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">Topics to Revise</h3>
                  <p className="text-xs text-on-surface-variant">Review these concepts to maintain 100% retention.</p>
                </div>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {roadmapData.revision_topics.map((topic: string, i: number) => (
                  <li key={topic} className="flex items-center gap-3 bg-surface-container p-3.5 rounded-xl border border-outline-variant/10">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary font-mono text-xs font-bold">{i + 1}</span>
                    <span className="text-xs font-semibold text-on-surface">{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="h-16" />

      {/* Floating Day Detail Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-surface-container-low rounded-[2rem] p-8 relative shadow-2xl overflow-y-auto max-h-[90vh] border border-outline-variant/15"
            >
              <button
                onClick={() => setSelectedDay(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-surface-container rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors z-10"
              >
                <X size={20} className="text-on-surface-variant" />
              </button>

              <div className="pr-12 space-y-6">
                <div>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${
                    selectedDay.status === 'completed' ? 'text-secondary' : selectedDay.status === 'active' ? 'text-cyan' : 'text-on-surface-variant'
                  }`}>
                    DAY {String(selectedDay.day_number).padStart(2, '0')}
                  </span>
                  <h2 className="font-headline font-extrabold text-3xl text-on-surface mt-1 leading-tight">{selectedDay.title}</h2>
                  <p className="text-on-surface-variant text-sm leading-relaxed mt-2">{selectedDay.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                  <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Target size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest font-mono">Task Details</span>
                    </div>
                    <p className="text-on-surface font-semibold text-base leading-relaxed">{selectedDay.task_name || 'Focus on applying concepts deeply.'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10">
                      <div className="flex items-center gap-2 text-tertiary mb-2">
                        <Construction size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest font-mono">Tools/Stack</span>
                      </div>
                      <p className="text-on-surface font-semibold text-sm">{selectedDay.stack || 'No specific tools required.'}</p>
                    </div>

                    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10">
                      <div className="flex items-center gap-2 text-secondary mb-2">
                        <Verified size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest font-mono">Expected Outcome</span>
                      </div>
                      <p className="text-on-surface font-semibold text-sm">{selectedDay.expected_outcome || 'Successfully completed daily objectives.'}</p>
                    </div>
                  </div>
                </div>

                {/* Resources, Books & Courses section */}
                {(() => {
                  const res = getResources(selectedDay.title, selectedDay.description || '');
                  return (
                    <div className="space-y-4 border-t border-outline-variant/10 pt-6">
                      <h3 className="font-headline font-bold text-base text-on-surface flex items-center gap-2">
                        <BookOpen size={18} className="text-primary" /> Resources, Books & Courses
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Books */}
                        <div className="bg-surface-container rounded-2xl p-4 space-y-2 border border-outline-variant/10">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary flex items-center gap-1.5 font-mono">
                            <GraduationCap size={13} /> Recommended Books
                          </span>
                          <ul className="space-y-1.5">
                            {res.books.map((b, i) => (
                              <li key={i} className="text-xs font-semibold text-on-surface flex items-start gap-2">
                                <span className="text-tertiary mt-0.5">▸</span> {b}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Courses */}
                        <div className="bg-surface-container rounded-2xl p-4 space-y-2 border border-outline-variant/10">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 font-mono">
                            <Video size={13} /> Online Courses
                          </span>
                          <ul className="space-y-1.5">
                            {res.courses.map((c, i) => (
                              <li key={i}>
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                >
                                  {c.name} <ExternalLink size={11} />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Docs / References */}
                      <div className="bg-surface-container rounded-2xl p-4 space-y-2 border border-outline-variant/10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5 font-mono">
                          <BookOpen size={13} /> Docs & References
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {res.docs.map((d, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary font-mono text-[10px] font-bold">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {selectedDay.video_url && (
                  <div className="pt-2">
                    <button
                      onClick={() => window.open(selectedDay.video_url, '_blank')}
                      className="w-full py-4 rounded-2xl bg-[#ff0000]/10 border border-[#ff0000]/20 text-[#ff0000] flex items-center justify-center gap-3 hover:bg-[#ff0000]/20 transition-all font-headline font-bold text-base group"
                    >
                      <div className="w-8 h-8 bg-[#ff0000] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#ff0000]/20 group-hover:scale-110 transition-transform">
                        <Youtube size={16} fill="currentColor" />
                      </div>
                      Listen & Learn on YouTube
                    </button>
                  </div>
                )}

                {/* AI Coach Unstuck */}
                <div className="pt-4 border-t border-outline-variant/10">
                  {!stuckData && !stuckLoading ? (
                    <button
                      onClick={handleStuck}
                      className="w-full py-4 rounded-xl border border-error/30 text-error flex items-center justify-center gap-2 hover:bg-error/5 transition-colors font-bold text-xs uppercase tracking-widest font-mono"
                    >
                      <LifeBuoy size={16} /> I'm Stuck — Break it down
                    </button>
                  ) : stuckLoading ? (
                    <div className="bg-surface-container-high rounded-xl p-6 flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '200ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '400ms' }}></span>
                      </div>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest font-mono">AI Coach is analyzing your task...</p>
                    </div>
                  ) : stuckData ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-5">
                      <div className="flex items-center gap-2 text-primary">
                        <LifeBuoy size={20} />
                        <h4 className="font-headline font-extrabold text-lg">AI Coach Unstuck Guide</h4>
                      </div>
                      <p className="text-on-surface text-sm leading-relaxed italic border-l-2 border-primary/50 pl-4">{stuckData.explanation}</p>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 block font-mono">Micro-Steps to move forward</span>
                        <ul className="space-y-3">
                          {stuckData.micro_steps?.map((step: string, i: number) => (
                            <li key={i} className="flex gap-3 items-start bg-surface-container p-3 rounded-xl border border-outline-variant/5">
                              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold font-mono">{i + 1}</span>
                              <span className="text-xs font-semibold text-on-surface leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ) : null}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

