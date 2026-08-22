import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Briefcase, MapPin, DollarSign, ExternalLink, Sparkles, ChevronRight } from 'lucide-react';
import { internshipsApi } from '../../api';

export const InternshipsScreen = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const data = await internshipsApi.getAll();
      setListings(data);
      if (data.length > 0) setSelectedJob(data[0]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    setApplying(true);
    setSuccessMsg('');
    try {
      const res = await internshipsApi.apply(jobId);
      setSuccessMsg(res.data.message || 'Application submitted successfully!');
    } catch (e) {
      console.error(e);
    }
    setApplying(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Skill-Matched Placements</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Internship Finder</h2>
      </div>

      {loading ? (
        <div className="text-center py-24 text-on-surface-variant font-semibold">Scanning job boards and matching verified skills...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: Listings list */}
          <div className="md:col-span-2 space-y-4">
            {listings.map((job) => (
              <div
                key={job.id}
                onClick={() => { setSelectedJob(job); setSuccessMsg(''); }}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col md:flex-row justify-between gap-4 bg-surface-container-low ${
                  selectedJob?.id === job.id ? 'border-primary shadow-xl shadow-primary/10' : 'border-outline-variant/10 hover:border-primary/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/10">{job.company}</span>
                    {job.isEligible ? (
                      <span className="text-[9px] font-bold text-secondary uppercase bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full">Eligible</span>
                    ) : (
                      <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase bg-surface-container-high border border-outline-variant/5 px-2 py-0.5 rounded-full">Requires {job.requiredCompletion}% syllabus</span>
                    )}
                  </div>
                  <h4 className="font-headline font-bold text-xl text-on-surface">{job.title}</h4>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-on-surface-variant">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} /> {job.stipend}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-between gap-3">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block">Skill Match</span>
                    <span className={`text-sm font-headline font-black block ${job.matchScore >= 70 ? 'text-secondary' : job.matchScore >= 40 ? 'text-primary' : 'text-on-surface-variant'}`}>{job.matchScore}% Match</span>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant/40 hidden md:block" />
                </div>
              </div>
            ))}
          </div>

          {/* Right panel: Active details & application actions */}
          <div className="md:col-span-1">
            {selectedJob ? (
              <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-xl space-y-6 sticky top-24">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedJob.company}</span>
                  <h3 className="font-headline font-bold text-xl text-on-surface">{selectedJob.title}</h3>
                </div>

                <div className="pt-4 border-t border-outline-variant/10 space-y-2 text-xs font-semibold text-on-surface-variant">
                  <p className="flex justify-between"><span>Location:</span> <span className="text-on-surface">{selectedJob.location}</span></p>
                  <p className="flex justify-between"><span>Type:</span> <span className="text-on-surface">{selectedJob.type}</span></p>
                  <p className="flex justify-between"><span>Stipend:</span> <span className="text-on-surface">{selectedJob.stipend}</span></p>
                </div>

                <div className="space-y-2 pt-4 border-t border-outline-variant/10">
                  <h5 className="font-headline font-bold text-xs text-on-surface">Description</h5>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{selectedJob.description}</p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-headline font-bold text-xs text-on-surface">Required Skillsets</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.tags.map((t: string) => (
                      <span key={t} className="px-2.5 py-0.5 bg-surface-container text-primary border border-primary/20 text-[10px] font-bold uppercase rounded-lg">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-outline-variant/10">
                  {/* Direct Official External Application Link */}
                  {selectedJob.applyUrl && (
                    <a
                      href={selectedJob.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface hover:text-primary font-headline font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      Official Careers Portal <ExternalLink size={14} />
                    </a>
                  )}

                  {/* DayOne Verified Direct Profile Submit */}
                  {successMsg ? (
                    <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold text-center leading-relaxed">
                      {successMsg}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(selectedJob.id)}
                      disabled={applying || !selectedJob.isEligible}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {applying ? 'Submitting profile...' : selectedJob.isEligible ? 'Quick Submit DayOne Profile' : 'Requires Higher Progress'}
                      <Sparkles size={14} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 text-center space-y-4 shadow-xl">
                <Briefcase size={32} className="text-on-surface-variant/30 mx-auto" />
                <h4 className="font-headline font-bold text-lg text-on-surface">Select Internship</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Choose an internship listing on the left to review details, external career portal links, and submit your verified profile.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
