import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import { chatApi } from '../../api';

export const AIChatScreen = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.getHistory().then(setMessages).catch(console.error);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input;
    setInput('');
    setSending(true);

    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      const res = await chatApi.sendMessage(userText);
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      }
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto border border-slate-800 bg-[#141724] rounded-3xl overflow-hidden shadow-2xl relative">
      
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#181c2b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-blue-400">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-headline font-extrabold text-base text-slate-100 leading-tight">AI Mentor Workspace</h3>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE ADVISOR
            </span>
          </div>
        </div>
        
        {/* Model Badge */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-full shadow-inner">
          <Sparkles size={12} className="text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">GEMINI 2.5 ACTIVE</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#141724]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-500">
              <MessageSquare size={28} />
            </div>
            <div className="space-y-1 max-w-xs">
              <p className="font-headline font-bold text-slate-200 text-base">Start a Technical Dialogue</p>
              <p className="text-xs text-slate-400 leading-relaxed">Ask any question on algorithms, debugging, code architecture, or career roadmaps.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isAI = msg.role === 'assistant';
            return (
              <div key={index} className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${isAI ? 'bg-slate-800 border border-slate-700 text-blue-400' : 'bg-emerald-950 border border-emerald-800 text-emerald-400'}`}>
                  {isAI ? <Bot size={16} /> : <User size={16} />}
                </div>
                
                {/* Bubble styling matching user reference screenshot */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  isAI 
                    ? 'bg-[#1f2330] border border-slate-800 text-slate-200 rounded-tl-sm shadow-md' 
                    : 'bg-[#3b82f6] text-white font-medium rounded-tr-sm shadow-lg shadow-blue-500/10'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}

        {sending && (
          <div className="flex gap-3 max-w-[85%] self-start">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-[#1f2330] border border-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span> Thinking...
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800/80 bg-[#181c2b] flex gap-3">
        <input
          type="text"
          className="flex-1 p-3.5 px-4 rounded-xl bg-[#141724] border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
          placeholder="Ask a technical question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="w-12 h-12 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white transition-all flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          disabled={sending || !input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </motion.div>
  );
};
