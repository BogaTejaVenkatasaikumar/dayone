import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Briefcase, Zap, Compass, ChevronRight 
} from 'lucide-react';
import { ResumeScreen } from './ResumeScreen';
import { ATSAnalyzerScreen } from './ATSAnalyzerScreen';
import { CoverLetterScreen } from './CoverLetterScreen';

export const CareerCenterScreen = () => {
  const [activeTab, setActiveTab] = useState<'resume' | 'ats' | 'cover-letter'>('resume');

  const tabs = [
    { id: 'resume', label: 'Resume Builder', icon: FileText, desc: 'Create & manage multiple resumes' },
    { id: 'ats', label: 'ATS Analyzer', icon: Compass, desc: 'Score your resume against JDs' },
    { id: 'cover-letter', label: 'Cover Letter', icon: Zap, desc: 'AI tailored cover letters' },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen bg-surface w-full">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 bg-surface-container-low border-b md:border-b-0 md:border-r border-outline-variant/10 p-4 md:p-6 flex flex-col gap-2 md:gap-6 z-10 glass-panel">
        
        <div className="hidden md:flex items-center gap-3 px-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-lg">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-headline font-black text-lg leading-tight text-on-surface">Career Center</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">DayOne Toolkit</p>
          </div>
        </div>

        {/* Mobile Horizontal Tabs / Desktop Vertical List */}
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible custom-scrollbar pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-3 px-4 py-3 md:py-4 rounded-2xl text-left transition-all shrink-0 md:shrink border ${isActive ? 'bg-primary text-white shadow-lg border-primary/20' : 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-transparent'}`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-primary"} />
                <div className="hidden md:block">
                  <div className="font-bold text-sm">{tab.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-white/80' : 'text-on-surface-variant/60'}`}>{tab.desc}</div>
                </div>
                <div className="md:hidden font-bold text-sm">{tab.label}</div>
                
                {isActive && (
                  <motion.div 
                    layoutId="activeTabIndicator" 
                    className="absolute right-3 hidden md:block"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <ChevronRight size={16} />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
        <AnimatePresence mode="sync">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="h-full"
          >
            {activeTab === 'resume' && <ResumeScreen />}
            {activeTab === 'ats' && <ATSAnalyzerScreen />}
            {activeTab === 'cover-letter' && <CoverLetterScreen />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};
