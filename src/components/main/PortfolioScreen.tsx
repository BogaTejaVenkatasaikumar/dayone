import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, Code, MapPin, Globe, Star, Award, ExternalLink, Activity,
  Camera, Edit3, Twitter, Linkedin, Github, Mail, Plus, X, Link,
  CheckCircle2, Briefcase, GraduationCap, Trophy, Eye
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { progressApi, roadmapApi, projectsApi } from '../../api';

export const PortfolioScreen = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // Editable profile fields
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || 'DayOne Scholar');
  const [headline, setHeadline] = useState('Full-Stack Developer · Open to Internships');
  const [bio, setBio] = useState('A dedicated technical candidate completing rigorous daily coursework on DayOne. Specializing in structured syllabus execution, algorithm building, and full-stack implementation.');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [personalUrl, setPersonalUrl] = useState('');
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js', 'SQL', 'Git', 'Docker']);
  const [newSkill, setNewSkill] = useState('');

  // Avatar / banner image
  const [avatarSrc, setAvatarSrc] = useState((user as any)?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=250');
  const [bannerSrc, setBannerSrc] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Share feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    progressApi.get().then(setStats).catch(console.error);
    roadmapApi.getAll().then(setRoadmap).catch(console.error);
    projectsApi.getAll().then(setProjects).catch(console.error);
  }, []);

  const completedProjects = projects.filter(p => p.status === 'reviewed');
  const level = stats?.currentLevel || 1;
  const xp = stats?.totalXp || 0;
  const streak = stats?.streakCount || 0;
  const completionPct = stats?.overallCompletionPct || 0;
  const completedModules = roadmap?.modules?.filter((m: any) => m.status === 'completed') || [];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarSrc(url);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBannerSrc(url);
  };

  const handleShare = () => {
    const profileUrl = `https://dayone.app/portfolio/${(displayName || 'user').toLowerCase().replace(/\s+/g, '-')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, '_blank');
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills(prev => [...prev, newSkill.trim()]);
      setNewSkill('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Public Showcase</span>
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Interactive Portfolio</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${editMode ? 'bg-secondary text-white' : 'bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface'}`}
          >
            <Edit3 size={13} /> {editMode ? 'Save Profile' : 'Edit Profile'}
          </button>
          <button
            onClick={handleShare}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 shadow-md"
          >
            {copied ? <><CheckCircle2 size={14} /> Link Copied!</> : <><Share2 size={14} /> Share Profile</>}
          </button>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="bg-surface-container rounded-[2rem] border border-outline-variant/10 shadow-2xl relative overflow-hidden">
        {/* Banner */}
        <div
          className="relative h-40 w-full overflow-hidden rounded-t-[2rem]"
          style={{ background: bannerSrc ? `url(${bannerSrc}) center/cover` : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #10b981 100%)' }}
        >
          {editMode && (
            <>
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold uppercase tracking-widest gap-2 hover:bg-black/60 transition-colors"
              >
                <Camera size={18} /> Change Banner
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </>
          )}
        </div>

        <div className="px-8 pb-8 relative">
          {/* Avatar */}
          <div className="absolute -top-14 left-8">
            <div className="relative w-28 h-28">
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-28 h-28 rounded-2xl object-cover border-4 border-surface-container shadow-xl"
              />
              {editMode && (
                <>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl text-white hover:bg-black/70 transition-colors"
                  >
                    <Camera size={20} />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>
          </div>

          <div className="pt-16">
            {/* Name & Headline */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div className="space-y-1">
                {editMode ? (
                  <div className="space-y-2">
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="font-headline font-extrabold text-3xl text-on-surface bg-transparent border-b-2 border-primary/50 outline-none w-full" />
                    <input value={headline} onChange={e => setHeadline(e.target.value)} className="text-sm text-on-surface-variant bg-transparent border-b border-outline-variant/20 outline-none w-full" />
                  </div>
                ) : (
                  <>
                    <h3 className="font-headline font-extrabold text-3xl text-on-surface">{displayName}</h3>
                    <p className="text-sm text-on-surface-variant font-medium">{headline}</p>
                  </>
                )}
                <span className="inline-block text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full mt-1">
                  {roadmap?.goal || user?.goal || 'Technical Generalist'}
                </span>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2 flex-wrap">
                {editMode ? (
                  <div className="space-y-2 w-56">
                    <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="GitHub URL" className="w-full px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface outline-none" />
                    <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL" className="w-full px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface outline-none" />
                    <input value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} placeholder="Twitter URL" className="w-full px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface outline-none" />
                    <input value={personalUrl} onChange={e => setPersonalUrl(e.target.value)} placeholder="Personal Website" className="w-full px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface outline-none" />
                  </div>
                ) : (
                  <>
                    {githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"><Github size={18} /></a>}
                    {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"><Linkedin size={18} /></a>}
                    {twitterUrl && <a href={twitterUrl} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"><Twitter size={18} /></a>}
                    {personalUrl && <a href={personalUrl} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"><Globe size={18} /></a>}
                    <a href={`mailto:${user?.email || ''}`} className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"><Mail size={18} /></a>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            {editMode
              ? <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full p-3 rounded-xl bg-surface-container-high border border-outline-variant/10 text-sm text-on-surface outline-none resize-none h-20 mb-4" />
              : <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed mb-6">{bio}</p>
            }

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Day Streak', val: streak, icon: Activity, color: 'text-tertiary' },
                { label: 'Level', val: level, icon: Award, color: 'text-primary' },
                { label: 'Total XP', val: xp.toLocaleString(), icon: Star, color: 'text-secondary' },
                { label: 'Modules Done', val: completedModules.length, icon: CheckCircle2, color: 'text-secondary' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="bg-surface-container-high rounded-2xl p-4 text-center space-y-1 border border-outline-variant/5">
                  <Icon size={20} className={`${color} mx-auto`} />
                  <p className="text-xl font-black text-on-surface">{val}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="space-y-3 mb-6">
              <h4 className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                <Code size={16} className="text-primary" /> Technical Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <div key={skill} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                    {skill}
                    {editMode && (
                      <button onClick={() => setSkills(prev => prev.filter(s => s !== skill))} className="ml-1 text-primary/60 hover:text-error">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {editMode && (
                  <div className="flex items-center gap-1">
                    <input
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSkill()}
                      placeholder="Add skill..."
                      className="px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/10 text-xs text-on-surface outline-none w-28"
                    />
                    <button onClick={addSkill} className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"><Plus size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Projects Grid ── */}
      <div className="space-y-4">
        <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2">
          <Trophy size={20} className="text-primary" /> Featured Projects
        </h4>
        {completedProjects.length === 0 ? (
          <div className="p-10 rounded-2xl bg-surface-container border border-outline-variant/10 text-center space-y-3">
            <Code size={36} className="text-on-surface-variant/30 mx-auto" />
            <p className="text-sm text-on-surface-variant font-medium">No reviewed projects yet.</p>
            <p className="text-xs text-on-surface-variant/60">Complete assignments and get them reviewed to showcase them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {completedProjects.map(p => (
              <motion.div
                key={p.id}
                whileHover={{ y: -4 }}
                className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 hover:border-primary/30 hover:shadow-xl transition-all space-y-4 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Code size={20} className="text-primary" />
                  </div>
                  <span className="text-[9px] font-black text-secondary bg-secondary/10 border border-secondary/20 px-2 py-1 rounded-full uppercase">{p.score}/100</span>
                </div>
                <div>
                  <h5 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors mb-1">{p.title}</h5>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{p.description}</p>
                </div>
                {p.submission_url && (
                  <a
                    href={p.submission_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    View Code <ExternalLink size={11} />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Academic Trajectory ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress */}
        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 space-y-5">
          <h4 className="font-headline font-bold text-base text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-3">
            <MapPin size={18} className="text-tertiary" /> Learning Progress
          </h4>
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Overall Completion</span>
              <span className="text-sm font-black text-primary">{completionPct}%</span>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Completed Modules</span>
            <ul className="space-y-2 mt-2">
              {completedModules.length === 0
                ? <li className="text-xs text-on-surface-variant italic">No modules fully completed yet.</li>
                : completedModules.slice(0, 5).map((m: any) => (
                  <li key={m.id} className="text-xs font-semibold text-on-surface flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-secondary shrink-0" /> {m.title}
                  </li>
                ))
              }
            </ul>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 space-y-5">
          <h4 className="font-headline font-bold text-base text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-3">
            <Activity size={18} className="text-primary" /> Achievement Summary
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Roadmap Goal', val: roadmap?.goal || user?.goal || '—' },
              { label: 'Projects Reviewed', val: `${completedProjects.length} projects` },
              { label: 'Current Level', val: `Level ${level} (${xp} XP)` },
              { label: 'Active Streak', val: `${streak} days` },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-outline-variant/5 last:border-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
                <span className="text-xs font-bold text-on-surface max-w-[60%] text-right truncate">{val}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
          >
            <Link size={14} /> {copied ? 'Portfolio Link Copied!' : 'Copy Public Profile Link'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
