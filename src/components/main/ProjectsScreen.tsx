import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Code, Award, CheckCircle2, AlertCircle, Plus, Sparkles, Send, FileText } from 'lucide-react';
import { projectsApi, roadmapApi } from '../../api';
import { AuthContext } from '../../context/AuthContext';

export const ProjectsScreen = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState<any[]>([]);
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [activeProject, setActiveProject] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
    roadmapApi.getAll().then(data => {
      const mods = data?.modules || (Array.isArray(data) ? data : []);
      setRoadmap(mods);
    }).catch(console.error);
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
      if (data.length > 0) setActiveProject(data[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId || generating) return;

    setGenerating(true);
    try {
      const res = await projectsApi.generate(selectedDayId, difficulty);
      if (res.ok) {
        await fetchProjects();
        setSelectedDayId('');
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !submissionUrl.trim() || submitting) return;

    setSubmitting(true);
    try {
      const ok = await projectsApi.submit(activeProject.id, submissionUrl);
      if (ok) {
        setSubmissionUrl('');
        await fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleEvaluate = async (projectId: string) => {
    setEvaluating(projectId);
    try {
      const res = await projectsApi.evaluate(projectId);
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
    setEvaluating(null);
  };

  // Find all active/completed days that could have projects
  const availableDays = roadmap.flatMap(m => m.days || []).filter(d => d.status !== 'locked');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Practical Implementation Sandbox</span>
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Hands-on Projects</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Sidebar / Projects list & Generation */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project generator panel */}
          <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl space-y-5">
            <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <Plus size={18} className="text-primary" /> Request AI Project
            </h4>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Select Roadmap Step</label>
                <select
                  className="w-full p-3 rounded-lg bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary border-none text-xs font-semibold"
                  value={selectedDayId}
                  onChange={e => setSelectedDayId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Day --</option>
                  {availableDays.map((d: any) => (
                    <option key={d.id} value={d.id}>Day {d.day_number}: {d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Target Difficulty</label>
                <select
                  className="w-full p-3 rounded-lg bg-surface-container-high text-on-surface outline-none focus:ring-2 focus:ring-primary border-none text-xs font-semibold"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                >
                  <option value="beginner">Beginner Sandbox</option>
                  <option value="intermediate">Intermediate Protocol</option>
                  <option value="advanced">Advanced Capstone</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generating || !selectedDayId}
                className="w-full py-3 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? 'Compiling syllabus...' : 'Assemble Project'}
                <Sparkles size={14} />
              </button>
            </form>
          </div>

          {/* User's projects list */}
          <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl space-y-4">
            <h4 className="font-headline font-bold text-lg text-on-surface">Active Sandboxes</h4>
            {projects.length === 0 ? (
              <p className="text-xs text-on-surface-variant/70">No active projects generated. Pick a roadmap step above and generate one!</p>
            ) : (
              <div className="space-y-2">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setActiveProject(proj)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${activeProject?.id === proj.id ? 'bg-primary-container/10 border-primary text-primary' : 'bg-surface-container-low border-outline-variant/5 hover:border-primary/20'}`}
                  >
                    <div>
                      <h5 className="font-bold text-sm text-on-surface line-clamp-1">{proj.title}</h5>
                      <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 block">Day {proj.day_id.slice(-4)} • {proj.difficulty}</span>
                    </div>
                    {proj.status === 'reviewed' && <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />}
                    {proj.status === 'submitted' && <AlertCircle size={16} className="text-tertiary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Active Project Details & Submit Workspace */}
        <div className="lg:col-span-2">
          {activeProject ? (
            <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline-variant/10 pb-6">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">{activeProject.difficulty}</span>
                  <h3 className="font-headline font-extrabold text-3xl text-on-surface mt-3">{activeProject.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block">Status</span>
                  <span className={`text-xs font-bold uppercase tracking-wider block mt-1 ${activeProject.status === 'reviewed' ? 'text-secondary' : activeProject.status === 'submitted' ? 'text-tertiary' : 'text-on-surface-variant'}`}>{activeProject.status}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-headline font-bold text-lg text-on-surface">Overview</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">{activeProject.description}</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-headline font-bold text-lg text-on-surface">Technical Requirements</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeProject.requirements?.map((req: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/5">
                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-xs font-semibold text-on-surface leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submissions form */}
              {activeProject.status === 'pending' && (
                <div className="pt-6 border-t border-outline-variant/10 space-y-4">
                  <h4 className="font-headline font-bold text-lg text-on-surface">Submit Sandbox</h4>
                  <form onSubmit={handleSubmitLink} className="flex flex-col md:flex-row gap-3">
                    <input
                      type="url"
                      className="flex-1 p-4 rounded-xl bg-surface-container-high border-none text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-semibold"
                      placeholder="e.g. GitHub Repository link or Vercel URL"
                      value={submissionUrl}
                      onChange={e => setSubmissionUrl(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      Submit Code <Send size={14} />
                    </button>
                  </form>
                </div>
              )}

              {activeProject.status === 'submitted' && (
                <div className="pt-6 border-t border-outline-variant/10 space-y-4">
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Submission Link</p>
                      <p className="text-sm font-semibold text-primary truncate max-w-sm mt-1">{activeProject.submission_url}</p>
                    </div>
                    <button
                      onClick={() => handleEvaluate(activeProject.id)}
                      disabled={evaluating === activeProject.id}
                      className="w-full md:w-auto px-6 py-4 rounded-xl bg-secondary text-on-secondary font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {evaluating === activeProject.id ? 'Evaluating code...' : 'Trigger AI Review'}
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>
              )}

              {activeProject.status === 'reviewed' && (
                <div className="pt-6 border-t border-outline-variant/10 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-headline font-bold text-xl text-on-surface">Evaluation Scorecard</h4>
                    <div className="flex items-center gap-2 bg-secondary/15 text-secondary border border-secondary/25 px-4 py-1.5 rounded-full">
                      <Award size={18} />
                      <span className="font-headline font-black text-lg">{activeProject.score} / 100</span>
                    </div>
                  </div>

                  <div className="bg-secondary/5 border border-secondary/25 p-6 rounded-2xl space-y-3">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">AI Code Reviewer Feedback</span>
                    <p className="text-sm text-on-surface-variant leading-relaxed italic">"{activeProject.evaluation}"</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full bg-surface-container rounded-[2rem] p-12 border border-outline-variant/10 flex flex-col items-center justify-center text-center space-y-4">
              <Briefcase size={48} className="text-on-surface-variant opacity-30" />
              <h4 className="font-headline font-bold text-xl text-on-surface">No Active Project Workspace</h4>
              <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">Select a generated project sandbox from the left panel, or pick a day to request a brand new assignment!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
