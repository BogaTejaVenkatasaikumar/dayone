import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Route, Code, ClipboardList, BookOpen, Briefcase, ArrowRight } from 'lucide-react';
import { roadmapApi, resourcesApi } from '../../api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (tab: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [roadmapData, setRoadmapData] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      roadmapApi.getAll().then(data => {
        setRoadmapData(data?.modules || []);
      }).catch(() => {});
      resourcesApi.getAll().then(setResources).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredDays = roadmapData.flatMap((m: any) => m.days || []).filter((d: any) => 
    d.title?.toLowerCase().includes(query.toLowerCase()) || 
    d.task_name?.toLowerCase().includes(query.toLowerCase()) ||
    d.stack?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredResources = resources.filter((r: any) => 
    r.title?.toLowerCase().includes(query.toLowerCase()) ||
    r.description?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl bg-surface-container-low border border-outline-variant/20 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Input */}
          <div className="p-4 border-b border-outline-variant/10 flex items-center gap-3">
            <Search size={20} className="text-primary" />
            <input
              type="text"
              autoFocus
              placeholder="Search syllabus topics, code labs, resources..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none"
            />
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          {/* Results List */}
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
            {!query ? (
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 pl-2">Quick Hub Shortcuts</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button onClick={() => { onSelectResult('learning'); onClose(); }} className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-primary/40 text-left flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <Route size={16} className="text-primary" /> Syllabus
                  </button>
                  <button onClick={() => { onSelectResult('practice'); onClose(); }} className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-secondary/40 text-left flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <Code size={16} className="text-secondary" /> Sandboxes
                  </button>
                  <button onClick={() => { onSelectResult('coach'); onClose(); }} className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-tertiary/40 text-left flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <BookOpen size={16} className="text-tertiary" /> AI Coach
                  </button>
                  <button onClick={() => { onSelectResult('career'); onClose(); }} className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-primary/40 text-left flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <Briefcase size={16} className="text-primary" /> Resume
                  </button>
                </div>
              </div>
            ) : (
              <>
                {filteredDays.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary pl-2">Syllabus Lessons & Topics</span>
                    {filteredDays.slice(0, 4).map((day: any) => (
                      <div
                        key={day.id}
                        onClick={() => { onSelectResult('learning'); onClose(); }}
                        className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-on-surface">{day.title}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{day.task_name || day.stack}</p>
                        </div>
                        <ArrowRight size={14} className="text-primary" />
                      </div>
                    ))}
                  </div>
                )}

                {filteredResources.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-secondary pl-2">Resources & Docs</span>
                    {filteredResources.slice(0, 3).map((res: any) => (
                      <div
                        key={res.id}
                        onClick={() => { onSelectResult('learning'); onClose(); }}
                        className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 hover:border-secondary/40 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-on-surface">{res.title}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{res.description}</p>
                        </div>
                        <ArrowRight size={14} className="text-secondary" />
                      </div>
                    ))}
                  </div>
                )}

                {filteredDays.length === 0 && filteredResources.length === 0 && (
                  <p className="text-xs text-on-surface-variant text-center py-8">No results found for "{query}".</p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
