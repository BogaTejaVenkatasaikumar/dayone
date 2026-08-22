import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Construction, Terminal, PlayCircle, Bookmark, BookOpen, Star, X, ArrowRight } from 'lucide-react';
import { resourcesApi } from '../../api';

export const ResourcesScreen = () => {
  const [resources, setResources] = useState<any>({ tools: [], courses: [], books: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  useEffect(() => {
    resourcesApi.getAll().then(setResources).catch(() => { });
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const r = await resourcesApi.search(q);
      setSearchResults(r);
    } catch {
      setSearchResults([]);
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      <section>
        <h2 className="font-headline font-extrabold text-4xl mb-4 tracking-tight">Resources</h2>
        <p className="text-on-surface-variant mb-8 max-w-2xl leading-relaxed">Curated high-performance tools, courses, and literature to accelerate your sprint to mastery.</p>
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Search size={20} className="text-outline" /></div>
          <input 
            className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all outline-none"
            placeholder="Search library..." 
            type="text" 
            value={searchQuery} 
            onChange={e => handleSearch(e.target.value)} 
          />
        </div>
      </section>

      {searchResults ? (
        <div className="space-y-4">
          <h3 className="font-headline font-bold text-xl">Search Results ({searchResults.length})</h3>
          {searchResults.map((r: any) => (
            <div key={r.id} onClick={() => setSelectedResource(r)} className="bg-surface-container rounded-xl p-6 cursor-pointer hover:bg-surface-container-high transition-all">
                <h4 className="font-headline font-bold text-lg">{r.title}</h4>
                <p className="text-sm text-on-surface-variant">{r.description}</p>
                <span className="text-[10px] text-primary uppercase font-bold">{r.category}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
                <Construction size={20} className="text-secondary" fill="currentColor" />
                <h3 className="font-headline font-bold text-xl uppercase tracking-widest text-on-surface">Tools</h3>
            </div>
            {resources.tools.map((r: any) => (
              <div key={r.id} onClick={() => setSelectedResource(r)} className="bg-surface-container rounded-xl p-6 group cursor-pointer hover:bg-surface-container-high transition-all">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform"><Terminal size={24} /></div>
                <h4 className="font-headline font-bold text-lg text-on-surface mb-2">{r.title}</h4>
                <p className="text-on-surface-variant text-sm mb-4">{r.description}</p>
                <div className="flex flex-wrap gap-2">{r.tags?.map((t: string) => <span key={t} className="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-1 rounded uppercase font-bold tracking-tighter">{t}</span>)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
                <PlayCircle size={20} className="text-primary" fill="currentColor" />
                <h3 className="font-headline font-bold text-xl uppercase tracking-widest text-on-surface">Courses</h3>
            </div>
            {resources.courses.map((r: any) => (
              <div key={r.id} onClick={() => setSelectedResource(r)} className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-1 group cursor-pointer transition-all hover:scale-[1.02]">
                <div className="bg-surface-container rounded-lg p-5">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-secondary/20 text-secondary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Mastery</span>
                    <Bookmark size={20} className="text-outline" />
                  </div>
                  <h4 className="font-headline font-bold text-xl text-on-surface mb-2">{r.title}</h4>
                  <p className="text-on-surface-variant text-sm mb-6">{r.description}</p>
                  {r.progress_pct > 0 && (
                    <>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${r.progress_pct}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[10px] font-bold text-outline uppercase">{r.progress_pct}% Complete</span>
                        <span className="text-primary text-xs font-bold">Resume Sprint →</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
                <BookOpen size={20} className="text-tertiary" fill="currentColor" />
                <h3 className="font-headline font-bold text-xl uppercase tracking-widest text-on-surface">Books</h3>
            </div>
            {resources.books.map((r: any) => (
              <div key={r.id} onClick={() => setSelectedResource(r)} className="bg-surface-container rounded-xl p-6 group cursor-pointer hover:bg-surface-container-high transition-all">
                <h4 className="font-headline font-bold text-lg text-on-surface mb-2">{r.title}</h4>
                <p className="text-on-surface-variant text-sm mb-4">{r.description}</p>
                {r.author && <p className="text-xs text-outline italic">{r.author}</p>}
                {r.rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="text-tertiary" fill={i <= r.rating ? "currentColor" : "none"} />)}
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedResource && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface-container-low border border-outline-variant/20 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedResource(null)}
                className="absolute top-6 right-6 p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X size={20} className="text-on-surface-variant" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  {selectedResource.category === 'tools' ? <Terminal size={24} /> : 
                   selectedResource.category === 'courses' ? <PlayCircle size={24} /> : 
                   <BookOpen size={24} />}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{selectedResource.category}</span>
                  <h3 className="font-headline font-bold text-2xl text-on-surface">{selectedResource.title}</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-container rounded-2xl p-6">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Star size={14} className="text-tertiary" /> Expert Breakdown
                  </h4>
                  <p className="text-on-surface leading-relaxed font-medium">
                    {selectedResource.explanation || "This is a curated resource selected to accelerate your mastery in this domain."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedResource.author && (
                    <div className="bg-surface-container-high rounded-xl p-4">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Author/Creator</span>
                      <span className="text-sm font-bold text-on-surface">{selectedResource.author}</span>
                    </div>
                  )}
                  {selectedResource.rating > 0 && (
                    <div className="bg-surface-container-high rounded-xl p-4">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Expert Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="text-tertiary" fill={i <= selectedResource.rating ? "currentColor" : "none"} />)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedResource.tags?.map((t: string) => (
                    <span key={t} className="bg-surface-container-highest text-on-surface-variant text-[10px] px-3 py-1.5 rounded-full uppercase font-bold tracking-wider">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
