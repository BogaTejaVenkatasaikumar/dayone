import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Award, CheckCircle2, XCircle, Plus, Sparkles, Send } from 'lucide-react';
import { assignmentsApi, roadmapApi } from '../../api';

export const AssignmentsScreen = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedDayId, setSelectedDayId] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [scorecard, setScorecard] = useState<any>(null);

  useEffect(() => {
    fetchAssignments();
    roadmapApi.getAll().then(data => {
      const mods = data?.modules || (Array.isArray(data) ? data : []);
      setRoadmap(mods);
    }).catch(console.error);
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await assignmentsApi.getAll();
      setAssignments(data);
      if (data.length > 0) {
        setActiveQuiz(data[0]);
        setScorecard(data[0].status === 'completed' ? { gradingDetails: data[0].feedback, score: data[0].score, maxScore: data[0].max_score } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId || generating) return;

    setGenerating(true);
    try {
      const res = await assignmentsApi.generate(selectedDayId);
      if (res.ok) {
        await fetchAssignments();
        setSelectedDayId('');
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const handleSelectQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    if (quiz.status === 'completed') {
      setScorecard({
        gradingDetails: quiz.feedback,
        score: quiz.score,
        maxScore: quiz.max_score
      });
    } else {
      setScorecard(null);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (activeQuiz?.status === 'completed') return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz || submitting) return;

    setSubmitting(true);
    try {
      const res = await assignmentsApi.submit(activeQuiz.id, userAnswers);
      if (res.data && res.data.score !== undefined) {
        setScorecard({
          gradingDetails: res.data.gradingDetails,
          score: res.data.score,
          maxScore: res.data.maxScore
        });
        await fetchAssignments();
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const availableDays = roadmap.flatMap(m => m.days || []).filter(d => d.status !== 'locked');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Self-Assessment Protocols</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Interactive Assignments</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Creation & List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Generation form */}
          <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl space-y-5">
            <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              <Plus size={18} className="text-primary" /> Request Quiz
            </h4>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Roadmap Reference</label>
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

              <button
                type="submit"
                disabled={generating || !selectedDayId}
                className="w-full py-3 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? 'Drafting assessment...' : 'Generate Assignment'}
                <Sparkles size={14} />
              </button>
            </form>
          </div>

          {/* Assignments list */}
          <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl space-y-4">
            <h4 className="font-headline font-bold text-lg text-on-surface">Available Quizzes</h4>
            {assignments.length === 0 ? (
              <p className="text-xs text-on-surface-variant/70">No assignments requested yet. Pick a roadmap reference above and generate a quiz!</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => handleSelectQuiz(quiz)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${activeQuiz?.id === quiz.id ? 'bg-primary-container/10 border-primary text-primary' : 'bg-surface-container-low border-outline-variant/5 hover:border-primary/20'}`}
                  >
                    <div>
                      <h5 className="font-bold text-sm text-on-surface line-clamp-1">{quiz.day_title} Quiz</h5>
                      <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 block">Day {quiz.day_id.slice(-4)} • Score: {quiz.status === 'completed' ? `${quiz.score}/${quiz.max_score}` : 'Pending'}</span>
                    </div>
                    {quiz.status === 'completed' && <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Quiz Workspace */}
        <div className="lg:col-span-2">
          {activeQuiz ? (
            <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-8">
              <div className="border-b border-outline-variant/10 pb-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">AI Guided Quiz</span>
                  <h3 className="font-headline font-extrabold text-3xl text-on-surface mt-3">{activeQuiz.day_title} Assessment</h3>
                </div>
                {scorecard && (
                  <div className="flex items-center gap-2 bg-secondary/15 text-secondary border border-secondary/25 px-4 py-2 rounded-full">
                    <Award size={18} />
                    <span className="font-headline font-black text-sm">{scorecard.score} / {scorecard.maxScore} Correct</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeQuiz.questions?.map((q: any, qi: number) => {
                  const savedGrading = scorecard?.gradingDetails?.find((d: any) => d.questionId === q.id);
                  const isCorrect = savedGrading?.isCorrect;

                  return (
                    <div key={q.id} className="space-y-3">
                      <h5 className="font-headline font-bold text-base text-on-surface flex items-start gap-2">
                        <span className="w-6 h-6 rounded-md bg-surface-container-high flex items-center justify-center text-xs font-bold flex-shrink-0">{qi + 1}</span>
                        <span>{q.question}</span>
                      </h5>

                      <div className="grid grid-cols-1 gap-2.5 pl-8">
                        {q.options?.map((opt: string) => {
                          const isSelected = userAnswers[q.id] === opt || (activeQuiz.status === 'completed' && savedGrading?.candidateAnswer === opt);
                          const isOptionCorrect = activeQuiz.status === 'completed' && q.answer === opt;
                          
                          let bgClass = 'bg-surface-container-high hover:bg-surface-container-highest border-transparent';
                          if (isSelected) bgClass = 'bg-primary/15 border-primary text-primary';
                          if (isOptionCorrect) bgClass = 'bg-secondary/15 border-secondary text-secondary';
                          if (isSelected && activeQuiz.status === 'completed' && !isCorrect) bgClass = 'bg-error/15 border-error text-error';

                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => handleSelectOption(q.id, opt)}
                              disabled={activeQuiz.status === 'completed'}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between gap-3 ${bgClass}`}
                            >
                              <span>{opt}</span>
                              {isOptionCorrect && <CheckCircle2 size={16} className="text-secondary flex-shrink-0" />}
                              {isSelected && activeQuiz.status === 'completed' && !isCorrect && <XCircle size={16} className="text-error flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {activeQuiz.status === 'completed' && savedGrading && (
                        <div className={`mt-2 ml-8 p-4 rounded-xl text-xs font-semibold leading-relaxed border ${isCorrect ? 'bg-secondary/5 border-secondary/10 text-on-surface-variant' : 'bg-error/5 border-error/10 text-on-surface-variant'}`}>
                          <span className="font-bold block uppercase tracking-wider mb-1 text-[9px]">{isCorrect ? 'Correct Explanation' : 'Conceptual Breakdown'}</span>
                          {savedGrading.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {activeQuiz.status === 'pending' && (
                  <div className="pt-6 border-t border-outline-variant/10">
                    <button
                      type="submit"
                      disabled={submitting || Object.keys(userAnswers).length < activeQuiz.questions?.length}
                      className="px-6 py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting score...' : 'Submit Answers'}
                      <Send size={14} />
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="h-full bg-surface-container rounded-[2rem] p-12 border border-outline-variant/10 flex flex-col items-center justify-center text-center space-y-4">
              <ClipboardList size={48} className="text-on-surface-variant opacity-30" />
              <h4 className="font-headline font-bold text-xl text-on-surface">No Active Quiz Session</h4>
              <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">Select a quiz from the left panel or choose an unlocked roadmap day to generate an adaptive quiz!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
