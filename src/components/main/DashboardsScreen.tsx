import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Building, ShieldAlert, Award, Search, Sparkles, Send, CheckCircle2, Trophy, Heart } from 'lucide-react';
import { dashboardsApi } from '../../api';

type PortalRole = 'student' | 'teacher' | 'parent' | 'institution';

export const DashboardsScreen = () => {
  const [role, setRole] = useState<PortalRole>('institution');

  // Institution State
  const [instData, setInstData] = useState<any>(null);
  // Teacher State
  const [teacherData, setTeacherData] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [teacherMsg, setTeacherMsg] = useState('');
  // Parent State
  const [parentSearchEmail, setParentSearchEmail] = useState('');
  const [parentStudent, setParentStudent] = useState<any>(null);
  const [parentMsg, setParentMsg] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentNote, setParentNote] = useState('');

  useEffect(() => {
    if (role === 'institution') {
      dashboardsApi.getInstitution().then(setInstData).catch(console.error);
    } else if (role === 'teacher') {
      fetchTeacherData();
    }
  }, [role]);

  const fetchTeacherData = () => {
    dashboardsApi.getTeacherStudents().then(setTeacherData).catch(console.error);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingId || !gradeFeedback.trim()) return;

    try {
      const ok = await dashboardsApi.gradeProject(gradingId, gradeScore, gradeFeedback);
      if (ok) {
        setTeacherMsg('Project graded successfully and student notified!');
        setGradingId(null);
        setGradeFeedback('');
        fetchTeacherData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleParentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentSearchEmail.trim()) return;
    setParentMsg('');
    setParentStudent(null);
    try {
      const data = await dashboardsApi.getParentStudent(parentSearchEmail);
      setParentStudent(data);
    } catch (err: any) {
      setParentMsg('No student found with that email address.');
    }
  };

  const handleParentMotivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentStudent || !parentName.trim() || !parentNote.trim()) return;

    try {
      const ok = await dashboardsApi.parentMotivate(parentStudent.student.id, parentName, parentNote);
      if (ok) {
        setParentMsg('Motivational note delivered to student Home Screen!');
        setParentNote('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Multi-Role Portal Shell</span>
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Administrative Dashboards</h2>
        </div>

        {/* Portal Role Toggles */}
        <div className="flex items-center gap-1.5 bg-surface-container p-1.5 rounded-2xl border border-outline-variant/10 shadow-lg">
          {(['institution', 'teacher', 'parent'] as PortalRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${role === r ? 'bg-primary-container text-white shadow' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* INSTITUTION DASHBOARD */}
        {role === 'institution' && instData && (
          <motion.div key="inst" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Active Roster</span>
                <span className="text-3xl font-black text-on-surface mt-2 block">{instData.metrics.totalStudents} Students</span>
              </div>
              <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Average Completion</span>
                <span className="text-3xl font-black text-secondary mt-2 block">{instData.metrics.averageCompletion}%</span>
              </div>
              <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Average Streak</span>
                <span className="text-3xl font-black text-tertiary mt-2 block">{instData.metrics.averageStreak} Days</span>
              </div>
              <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Active Cohorts</span>
                <span className="text-3xl font-black text-primary mt-2 block">{instData.metrics.activeCohortsCount} Classes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Cohorts list */}
              <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
                <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                  <Building size={20} className="text-primary" /> Registered Cohorts
                </h4>
                <div className="space-y-4">
                  {instData.cohorts.map((c: any) => (
                    <div key={c.id} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex items-center justify-between gap-4">
                      <div>
                        <h5 className="font-bold text-base text-on-surface">{c.name}</h5>
                        <p className="text-xs text-on-surface-variant mt-1">Focus: {c.focus} • {c.activeRoadmaps} Active Tracks</p>
                      </div>
                      <span className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">{c.size} Learners</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboards */}
              <div className="md:col-span-1 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
                <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                  <Trophy size={20} className="text-tertiary" /> Top Performers
                </h4>
                <div className="space-y-3">
                  {instData.leaderboards.map((s: any, idx: number) => (
                    <div key={s.email} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/5">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-tertiary/20 text-tertiary' : idx === 1 ? 'bg-primary-container/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{idx + 1}</span>
                        <div>
                          <p className="font-bold text-xs text-on-surface line-clamp-1">{s.name || s.email.split('@')[0]}</p>
                          <p className="text-[9px] text-on-surface-variant">{s.total_xp} XP</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-secondary">{s.overall_completion_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TEACHER DASHBOARD */}
        {role === 'teacher' && teacherData && (
          <motion.div key="teach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            {teacherMsg && (
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-sm font-semibold text-center">
                {teacherMsg}
              </div>
            )}

            {/* Pending project reviews */}
            <section className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
              <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                <ShieldAlert size={20} className="text-tertiary animate-pulse" /> Pending Code Submissions
              </h4>
              {teacherData.pendingGrading.length === 0 ? (
                <p className="text-sm text-on-surface-variant/70 text-center py-6">All student sandboxes evaluated. Good job!</p>
              ) : (
                <div className="space-y-4">
                  {teacherData.pendingGrading.map((sub: any) => (
                    <div key={sub.id} className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">{sub.day_title}</span>
                        <h5 className="font-bold text-lg text-on-surface">{sub.title}</h5>
                        <p className="text-xs text-on-surface-variant">Submitted by: <span className="font-bold text-on-surface">{sub.student_name}</span></p>
                        <p className="text-xs text-primary truncate max-w-sm"><a href={sub.submission_url} target="_blank" rel="noreferrer" className="underline">{sub.submission_url}</a></p>
                      </div>

                      {gradingId === sub.id ? (
                        <form onSubmit={handleGradeSubmit} className="space-y-3 bg-surface-container-high p-4 rounded-xl border border-outline-variant/15 w-full md:max-w-md">
                          <div className="flex gap-4">
                            <div className="w-1/3">
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Score</label>
                              <input
                                type="number"
                                className="w-full p-2.5 rounded-lg bg-surface-container-low border-none text-on-surface font-bold text-sm outline-none"
                                value={gradeScore}
                                onChange={e => setGradeScore(parseInt(e.target.value))}
                                min="0" max="100" required
                              />
                            </div>
                            <div className="w-2/3">
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Feedback</label>
                              <input
                                type="text"
                                className="w-full p-2.5 rounded-lg bg-surface-container-low border-none text-on-surface text-xs outline-none"
                                placeholder="Keep it up! Good implementation."
                                value={gradeFeedback}
                                onChange={e => setGradeFeedback(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary font-headline font-bold text-xs uppercase tracking-wider hover:opacity-90">Grade</button>
                            <button type="button" onClick={() => setGradingId(null)} className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-bold">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setGradingId(sub.id); setGradeScore(85); }}
                          className="px-5 py-3 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                          Review Sandbox
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Students list */}
            <section className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
              <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                <Users size={20} className="text-primary" /> Active Students Roster
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacherData.students.map((stud: any) => (
                  <div key={stud.id} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex items-center gap-4">
                    <img
                      src={stud.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt="Avatar"
                      className="w-12 h-12 rounded-full object-cover border border-outline-variant/20 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-base text-on-surface truncate">{stud.name || stud.email.split('@')[0]}</h5>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{stud.goal || 'No goal set yet'}</p>
                      <div className="flex gap-4 mt-2 text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider">
                        <span>Lvl {stud.current_level}</span>
                        <span>Streak: {stud.streak_count}d</span>
                        <span className="text-secondary">{stud.overall_completion_pct}% Completed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* PARENT DASHBOARD */}
        {role === 'parent' && (
          <motion.div key="parent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
              <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                <Search size={20} className="text-primary" /> Find Your Student
              </h4>
              <form onSubmit={handleParentSearch} className="flex gap-3">
                <input
                  type="email"
                  className="flex-1 p-4 rounded-xl bg-surface-container-high border-none text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-semibold"
                  placeholder="Enter student's exact account email"
                  value={parentSearchEmail}
                  onChange={e => setParentSearchEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Search <Search size={14} />
                </button>
              </form>

              {parentMsg && (
                <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-semibold text-center">
                  {parentMsg}
                </div>
              )}
            </div>

            {parentStudent && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Student Stats overview */}
                <div className="md:col-span-1 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl text-center space-y-6">
                  <img
                    src={parentStudent.student.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt="Student avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 mx-auto shadow-lg"
                  />
                  <div className="space-y-1">
                    <h5 className="font-headline font-bold text-xl text-on-surface">{parentStudent.student.name}</h5>
                    <p className="text-xs text-on-surface-variant">{parentStudent.student.email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/10 text-xs font-semibold text-on-surface-variant">
                    <div className="text-center p-3 bg-surface-container-low rounded-xl">
                      <span className="block text-xl font-black text-secondary">{parentStudent.student.streak_count} Days</span>
                      <span>Streak</span>
                    </div>
                    <div className="text-center p-3 bg-surface-container-low rounded-xl">
                      <span className="block text-xl font-black text-primary">{parentStudent.student.overall_completion_pct}%</span>
                      <span>Completion</span>
                    </div>
                  </div>
                </div>

                {/* Send encouragement form */}
                <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
                  <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
                    <Heart size={20} className="text-error fill-current" /> Send encouragement
                  </h4>

                  <form onSubmit={handleParentMotivate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Your Name</label>
                        <input
                          type="text"
                          className="w-full p-4 rounded-xl bg-surface-container-high border-none text-on-surface outline-none text-xs font-semibold"
                          placeholder="e.g. Mom, Dad"
                          value={parentName}
                          onChange={e => setParentName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Motivational Note</label>
                      <textarea
                        className="w-full p-4 rounded-xl bg-surface-container-high border-none text-on-surface outline-none text-xs font-semibold resize-none h-24"
                        placeholder="e.g. Super proud of you! Keep up the hard work coding!"
                        value={parentNote}
                        onChange={e => setParentNote(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-4 rounded-xl bg-secondary text-on-secondary font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      Deliver Message <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
