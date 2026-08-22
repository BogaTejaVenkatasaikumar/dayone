import React, { useState, useEffect, useRef } from 'react';
import { Settings, Target, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayOneLogo } from './DayOneLogo';

interface TopAppBarProps {
  user: any;
  onLogout: () => void;
  onChangeGoal: () => void;
}

export const TopAppBar = ({ user, onLogout, onChangeGoal }: TopAppBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="bg-surface sticky top-0 z-40 border-b border-surface-container-low backdrop-blur-md bg-opacity-80">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <DayOneLogo size={48} className="rounded-[1.1rem] shadow-[0_4px_14px_rgba(13,21,38,0.55)]" />
          <h1 className="text-on-surface font-bold text-2xl font-headline flex items-center gap-1 tracking-tight">
            Day<span className="text-primary italic">One</span>
          </h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-xl transition-colors active:scale-95 duration-150 ${menuOpen ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
          >
            <Settings size={24} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-64 bg-surface-container-high rounded-2xl border border-outline-variant/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden z-50"
              >
                {user && (
                  <div className="px-5 py-4 border-b border-outline-variant/10">
                    <p className="text-sm font-bold text-on-surface truncate">{user.name || user.email}</p>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{user.email}</p>
                  </div>
                )}
                <div className="p-2">
                  <button
                    onClick={() => { setMenuOpen(false); onChangeGoal(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Target size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">Change Goal</p>
                      <p className="text-[10px] text-on-surface-variant">Set a new learning objective</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/10 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center text-error flex-shrink-0">
                      <LogOut size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface group-hover:text-error transition-colors">Sign Out</p>
                      <p className="text-[10px] text-on-surface-variant">Log out of your account</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
