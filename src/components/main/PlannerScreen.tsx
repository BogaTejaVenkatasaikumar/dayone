import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Plus, CheckSquare, Square, Trash2, CalendarDays, Sparkles } from 'lucide-react';
import { plannerApi } from '../../api';

export const PlannerScreen = () => {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlanner();
  }, [date]);

  const fetchPlanner = async () => {
    setLoading(true);
    try {
      const data = await plannerApi.getAll(date);
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await plannerApi.create(title, time, date);
      if (res.ok) {
        setTitle('');
        fetchPlanner();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const success = await plannerApi.toggle(id, !currentStatus);
      if (success) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await plannerApi.delete(id);
      if (success) {
        setItems(prev => prev.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Time Management Protocols</span>
          <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Daily Planner</h2>
        </div>
        <div className="flex items-center gap-3 bg-surface-container px-4 py-3 rounded-2xl border border-outline-variant/10 shadow-lg">
          <CalendarDays size={20} className="text-primary" />
          <input
            type="date"
            className="bg-transparent border-none text-on-surface outline-none text-sm font-semibold select-none cursor-pointer"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column: Add Schedule Item */}
        <div className="md:col-span-1 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6 h-fit">
          <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            <Plus size={20} className="text-primary" /> Schedule Session
          </h4>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Protocol/Topic</label>
              <input
                type="text"
                className="w-full p-4 rounded-xl bg-surface-container-high border-none text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-semibold"
                placeholder="e.g. Code project, review state"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Scheduled Time</label>
              <div className="relative">
                <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
                <input
                  type="time"
                  className="w-full p-4 pl-12 rounded-xl bg-surface-container-high border-none text-on-surface outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-semibold cursor-pointer"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Schedule Task
            </button>
          </form>
        </div>

        {/* Right column: Chronological Checklist */}
        <div className="md:col-span-2 bg-surface-container rounded-[2rem] p-8 border border-outline-variant/10 shadow-xl space-y-6">
          <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-4">
            <Calendar size={20} className="text-secondary" /> Daily Schedule Checklist
          </h4>

          {loading ? (
            <div className="text-center py-12 text-on-surface-variant/60 text-sm font-semibold">Running database scan...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-on-surface-variant font-medium">No sessions scheduled for this date.</p>
              <p className="text-xs text-on-surface-variant/60">Schedule your study periods, breaks, or mock assessments to establish study habits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.is_completed ? 'bg-surface-container-low border-secondary/20 opacity-70' : 'bg-surface-container-high border-outline-variant/10 hover:border-primary/20'}`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggle(item.id, item.is_completed)}
                      className={`text-2xl transition-transform active:scale-90 ${item.is_completed ? 'text-secondary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                      {item.is_completed ? <CheckSquare size={22} /> : <Square size={22} />}
                    </button>
                    <div>
                      <h5 className={`font-semibold text-base transition-colors ${item.is_completed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{item.title}</h5>
                      <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-0.5">
                        <Clock size={10} /> {item.scheduled_time}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
