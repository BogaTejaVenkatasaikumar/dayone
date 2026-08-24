import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useAuth } from '@clerk/clerk-react';
import { BASE_URL } from '../../api';

export const XPLevelBadge: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { getToken } = useAuth();
  
  const [xpData, setXpData] = useState<any>(null);

  const fetchXp = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/engagement/xp`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setXpData(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchXp();
      // Polling could be added here or rely on global event emitter
      const interval = setInterval(fetchXp, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!xpData) return null;

  // Calculate progress within current level
  const prevThreshold = xpData.totalXp - (xpData.xpForNextLevel - xpData.totalXp); // simplified, assuming we want just a generic fill for now
  // For exact calc we'd need the current level threshold. Let's just use a rough percentage for now or fetch thresholds from api
  // The API doesn't return the base threshold for current level, so we just calculate % of next level
  const pct = Math.min(100, Math.round((xpData.totalXp / xpData.xpForNextLevel) * 100));

  return (
    <div className="group relative">
      <div className="flex items-center gap-3 bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/20 hover:border-primary/30 transition-colors cursor-pointer">
        <div className="flex items-center gap-1 text-tertiary">
          <Zap size={14} fill="currentColor" />
          <span className="text-xs font-bold whitespace-nowrap">Lvl {xpData.level} {xpData.levelName}</span>
        </div>
        
        <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden hidden sm:block">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className="h-full bg-gradient-to-r from-tertiary to-yellow-300"
          />
        </div>
        
        <span className="text-xs font-semibold text-on-surface-variant font-mono">
          {xpData.totalXp.toLocaleString()} XP
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 w-48 p-3 rounded-xl bg-surface-container-highest border border-outline-variant/20 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Current Level</span>
            <span className="font-bold text-on-surface">{xpData.level}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Next Level</span>
            <span className="font-bold text-on-surface">{xpData.xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="h-[1px] bg-outline-variant/10 my-1" />
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant">Longest Streak</span>
            <span className="font-bold text-tertiary">{xpData.longestStreak} Days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
