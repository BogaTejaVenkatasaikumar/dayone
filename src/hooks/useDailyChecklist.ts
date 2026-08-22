import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export interface Mission {
  title: string;
  completed: boolean;
  xpReward: number;
}

export interface XPData {
  totalXp: number;
  level: number;
  levelName: string;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
}

export const useDailyChecklist = (user: any) => {
  const { getToken } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalXpReward, setTotalXpReward] = useState(0);
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklistData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [missionsRes, xpRes] = await Promise.all([
        fetch('/api/engagement/missions', { headers }),
        fetch('/api/engagement/xp', { headers })
      ]);

      if (!missionsRes.ok || !xpRes.ok) {
        throw new Error('Failed to load checklist or XP data');
      }

      const missionsJson = await missionsRes.json();
      const xpJson = await xpRes.json();

      setMissions(missionsJson.missions || []);
      setCompletedCount(missionsJson.completedCount || 0);
      setTotalCount(missionsJson.totalCount || 0);
      setTotalXpReward(missionsJson.totalXpReward || 0);
      setXpData(xpJson);
    } catch (err: any) {
      console.error('Error fetching checklist data:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  const completeMission = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= missions.length) return;
    const mission = missions[idx];
    if (mission.completed) return;

    // Save previous state for rollback
    const prevMissions = [...missions];
    const prevCompletedCount = completedCount;
    const prevXpData = xpData ? { ...xpData } : null;

    // Optimistic Update
    const updatedMissions = missions.map((m, i) => i === idx ? { ...m, completed: true } : m);
    setMissions(updatedMissions);
    setCompletedCount(prev => prev + 1);
    
    if (xpData) {
      setXpData({
        ...xpData,
        totalXp: xpData.totalXp + mission.xpReward
      });
    }

    try {
      const token = await getToken();
      const res = await fetch(`/api/engagement/missions/${idx}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to complete mission on server');
      }

      const result = await res.json();
      
      // Update streak/xp values returned by server if they differ
      if (xpData) {
        setXpData(prev => prev ? {
          ...prev,
          currentStreak: result.streakCount ?? prev.currentStreak,
          totalXp: result.newTotalXp ?? prev.totalXp,
          level: result.newLevel ?? prev.level
        } : null);
      }
    } catch (err) {
      console.error('Failed to complete daily mission, rolling back:', err);
      // Rollback on failure
      setMissions(prevMissions);
      setCompletedCount(prevCompletedCount);
      setXpData(prevXpData);
    }
  }, [missions, completedCount, xpData, getToken]);

  useEffect(() => {
    fetchChecklistData();
  }, [fetchChecklistData]);

  return {
    missions,
    completedCount,
    totalCount,
    totalXpReward,
    xpData,
    loading,
    error,
    completeMission,
    refresh: fetchChecklistData
  };
};
