import React, { useState } from 'react';
import { 
  LayoutDashboard, BookOpen, Terminal, Briefcase,
  User, LogOut, RefreshCw, ChevronDown, Menu, X, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayOneLogo } from './DayOneLogo';
import { XPLevelBadge } from './XPLevelBadge';

export type MainTab = 'home' | 'learning' | 'practice' | 'career';

interface TopHeaderNavProps {
  activeTab: MainTab;
  setActiveTab: (t: MainTab) => void;
  onLogout: () => void;
  user: any;
  onChangeGoal: () => void;
}

const NAV_TABS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: Terminal },
  { id: 'career', label: 'Career', icon: Briefcase },
];

export const TopHeaderNav: React.FC<TopHeaderNavProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  user,
  onChangeGoal
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-surface-container/85 backdrop-blur-xl border-b border-outline-variant/10 px-4 lg:px-8 flex items-center justify-between text-on-surface">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <DayOneLogo size={28} className="group-hover:scale-105 transition-transform" />
            <span className="font-headline font-bold text-xl tracking-tight hidden sm:inline-block">
              Day<span className="text-primary italic">One</span>
            </span>
          </div>
        </div>

        {/* Center: Main Hub Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low/80 p-1 rounded-full border border-outline-variant/10 shadow-inner">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainTab)}
                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full shadow-[0_0_12px_rgba(77,142,255,0.15)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={15} className={`relative z-10 ${isActive ? 'text-primary' : ''}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: XP Level & User Profile */}
        <div className="flex items-center gap-3">
          <XPLevelBadge />

          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full border border-outline-variant/20 hover:border-primary/40 bg-surface-container-low transition-all"
            >
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt="User Avatar"
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="hidden sm:inline-block text-xs font-bold text-on-surface max-w-[100px] truncate pr-1">
                {user?.name || 'Learner'}
              </span>
              <ChevronDown size={14} className={`text-on-surface-variant transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-2xl p-2 z-50 space-y-1"
                >
                  <div className="px-3 py-2 border-b border-outline-variant/10 mb-1">
                    <p className="text-xs font-bold text-on-surface">{user?.name || 'Active Learner'}</p>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider truncate mt-0.5">{user?.goal || 'No Active Goal'}</p>
                  </div>

                  <button
                    onClick={() => { onChangeGoal(); setProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <RefreshCw size={14} className="text-primary" /> Reset Sprint Goal
                  </button>

                  <button
                    onClick={() => { onLogout(); setProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-surface-container border border-outline-variant/10 text-on-surface"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-16 left-0 right-0 bg-[#0b0f19] border-b border-outline-variant/10 p-4 lg:hidden space-y-2 z-40"
            >
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as MainTab); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
