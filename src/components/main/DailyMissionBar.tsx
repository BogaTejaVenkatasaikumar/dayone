import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Flame, Sparkles } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { setTokenGetter, BASE_URL } from '../../api';
import { useAuth } from '@clerk/clerk-react';

export const DailyMissionBar: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { getToken } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [xpData, setXpData] = useState<any>(null);

  const fetchMissions = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/engagement/missions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setData(await res.json());
      
      const xpRes = await fetch(`${BASE_URL}/api/engagement/xp`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (xpRes.ok) setXpData(await xpRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMissions();
  }, [user]);

  const handleComplete = async (idx: number) => {
    if (data.missions[idx].completed) return;
    
    // Optimistic update
    const newMissions = [...data.missions];
    newMissions[idx].completed = true;
    setData({ ...data, missions: newMissions, completedCount: data.completedCount + 1 });
    
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/engagement/missions/${idx}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setXpData((prev: any) => ({ ...prev, currentStreak: result.streakCount }));
      }
    } catch (err) {
      console.error(err);
      fetchMissions(); // revert
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/15 shadow-xl animate-pulse space-y-4">
        <div className="h-6 bg-outline-variant/20 rounded w-1/3"></div>
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-outline-variant/10 rounded w-full"></div>)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pct = Math.round((data.completedCount / data.totalCount) * 100);
  const allDone = data.completedCount === data.totalCount;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container/80 backdrop-blur-md rounded-3xl p-6 border border-outline-variant/15 shadow-xl relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="font-headline font-bold text-lg text-on-surface">TODAY'S MISSION</h3>
        </div>
        <div className="text-sm font-bold text-tertiary flex items-center gap-1">
          +{data.totalXpReward} XP total
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {data.missions.map((m: any, idx: number) => (
          <motion.div 
            key={idx}
            onClick={() => handleComplete(idx)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              m.completed 
                ? 'bg-surface-container-high/50 border-outline-variant/10 opacity-70' 
                : 'bg-surface border-outline-variant/20 hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              {m.completed ? (
                <CheckCircle2 size={20} className="text-secondary" />
              ) : (
                <Circle size={20} className="text-outline-variant" />
              )}
              <span className={`text-sm font-semibold ${m.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                {m.title}
              </span>
            </div>
            <span className={`text-xs font-bold ${m.completed ? 'text-outline-variant' : 'text-primary'}`}>
              +{m.xpReward} XP
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              className={`h-full ${allDone ? 'bg-secondary' : 'bg-gradient-to-r from-primary to-primary-container'}`}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-on-surface-variant w-10 text-right">{pct}%</span>
      </div>

      {xpData && (
        <div className="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-tertiary bg-tertiary/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            <Flame size={14} fill="currentColor" /> {xpData.currentStreak} day streak
          </div>
          
          <AnimatePresence>
            {allDone && (
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 text-secondary text-xs font-bold"
              >
                <Sparkles size={14} /> Mission Accomplished!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
