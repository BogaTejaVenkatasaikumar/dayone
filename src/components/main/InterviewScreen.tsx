import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, User, Send, Sparkles, Award, Video, VideoOff, RefreshCw,
  Mic, MicOff, Volume2, VolumeX, Radio, Settings2, Headphones,
  Phone, PhoneOff, Loader2
} from 'lucide-react';
import { interviewsApi, roadmapApi, voiceApi } from '../../api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  isPlaying?: boolean;
}

// Voice options the user can pick from
const VOICE_PRESETS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Professional Female', icon: '👩‍💼' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Professional Male', icon: '👨‍💼' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', desc: 'Warm Female', icon: '👩' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Confident Male', icon: '👨' },
];

export const InterviewScreen = () => {
  const [activeInterview, setActiveInterview] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  // ─── Voice State ────────────────────────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_PRESETS[0].id);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    interviewsApi.getActive().then(data => {
      setActiveInterview(data);
      if (data) {
        const conv: ChatMessage[] = [];
        data.questions.forEach((q: string, i: number) => {
          conv.push({ role: 'assistant', content: q });
          if (data.answers[i] !== undefined) {
            conv.push({ role: 'user', content: data.answers[i] });
          }
        });
        setHistory(conv);
      }
    }).catch(console.error);

    roadmapApi.getAll().then(setRoadmap).catch(console.error);
  }, []);

  // Scroll to bottom on history change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, sending]);

  // ─── Text-to-Speech via ElevenLabs ──────────────────────────────────────────
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsSpeaking(true);
    setVoiceError('');

    try {
      const blob = await voiceApi.textToSpeech(text, selectedVoice);
      if (!blob) {
        setVoiceError('Voice synthesis unavailable');
        setIsSpeaking(false);
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setVoiceError('Audio playback failed');
      };

      await audio.play();
    } catch (e: any) {
      console.error('TTS error:', e);
      setIsSpeaking(false);
      setVoiceError('Voice synthesis failed');
    }
  }, [voiceEnabled, selectedVoice]);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // ─── Speech-to-Text via Web Speech API ──────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    // Stop any playing audio so the mic doesn't pick it up
    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + ' ';
        } else {
          interim = t;
        }
      }
      const combined = (finalTranscript + interim).trim();
      setTranscript(combined);
      setInput(combined);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        setVoiceError(`Mic error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
    setVoiceError('');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ─── Interview Actions ──────────────────────────────────────────────────────
  const handleStart = async () => {
    const roleName = roadmap?.goal || 'Technical Candidate';
    setStarting(true);
    try {
      const res = await interviewsApi.start(roleName);
      if (res.data && res.data.id) {
        setActiveInterview(res.data);
        const firstQ = res.data.question;
        setHistory([{ role: 'assistant', content: firstQ }]);

        // Auto-speak the first question
        if (autoSpeak) {
          setTimeout(() => speakText(firstQ), 300);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setStarting(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending || !activeInterview) return;

    // Stop listening if active
    stopListening();

    const text = input.trim();
    setInput('');
    setTranscript('');
    setSending(true);

    setHistory(prev => [...prev, { role: 'user', content: text }]);

    try {
      const res = await interviewsApi.answer(activeInterview.id, text);
      if (res.data && res.data.is_completed) {
        const feedbackText = `Interview Completed! 🎉\n\nFinal Score: ${res.data.score}/100\n\nFeedback: ${res.data.feedback}`;
        setActiveInterview((prev: any) => ({
          ...prev,
          status: 'completed',
          score: res.data.score,
          feedback: res.data.feedback
        }));
        setHistory(prev => [...prev, { role: 'assistant', content: feedbackText }]);
        if (autoSpeak) speakText(`Interview completed. Your final score is ${res.data.score} out of 100. ${res.data.feedback}`);
      } else if (res.data) {
        const nextQ = res.data.question;
        setActiveInterview((prev: any) => ({
          ...prev,
          current_question_index: res.data.current_question_index
        }));
        setHistory(prev => [...prev, { role: 'assistant', content: nextQ }]);
        if (autoSpeak) speakText(nextQ);
      }
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  const handleReset = () => {
    stopSpeaking();
    stopListening();
    setActiveInterview(null);
    setHistory([]);
    setInput('');
    setTranscript('');
  };

  const selectedVoiceInfo = VOICE_PRESETS.find(v => v.id === selectedVoice) || VOICE_PRESETS[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Headphones size={14} /> Voice-Enabled Mock Interview
          </span>
          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl tracking-tight text-on-surface">AI Interview Studio</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Voice toggle */}
          <button
            onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeaking) stopSpeaking(); }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${voiceEnabled
              ? 'bg-secondary/10 text-secondary border border-secondary/20'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant/10'
            }`}
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>
          
          {/* Voice settings */}
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/10 text-on-surface-variant hover:text-on-surface text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Settings2 size={14} /> Voice Settings
          </button>
        </div>
      </div>

      {/* Voice Settings Panel */}
      <AnimatePresence>
        {showVoiceSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 space-y-4">
              <h4 className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                <Headphones size={16} className="text-primary" /> Interviewer Voice Selection
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {VOICE_PRESETS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-4 rounded-xl border text-left transition-all space-y-1 ${
                      selectedVoice === v.id
                        ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                        : 'bg-surface-container-high border-outline-variant/10 hover:border-primary/20'
                    }`}
                  >
                    <span className="text-2xl block">{v.icon}</span>
                    <span className="text-xs font-bold text-on-surface block">{v.name}</span>
                    <span className="text-[10px] text-on-surface-variant">{v.desc}</span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={e => setAutoSpeak(e.target.checked)}
                  className="rounded border-outline-variant accent-primary"
                />
                <span className="font-semibold">Auto-speak interviewer questions</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      <AnimatePresence>
        {voiceError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold flex items-center justify-between"
          >
            <span>{voiceError}</span>
            <button onClick={() => setVoiceError('')} className="text-error/60 hover:text-error ml-3">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Pre-Interview Landing ──────────────────────────────────────────── */}
      {!activeInterview ? (
        <div className="bg-surface-container rounded-[2rem] p-12 border border-outline-variant/10 text-center space-y-8 shadow-2xl relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          <div className="relative space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white mx-auto shadow-xl">
              <Headphones size={36} />
            </div>
            <div className="space-y-3 max-w-lg mx-auto">
              <h3 className="font-headline font-extrabold text-2xl text-on-surface">Voice-Powered Technical Interview</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Prepare for your next interview with an AI interviewer powered by <span className="font-bold text-primary">ElevenLabs</span> voice technology.
                Answer by typing or speaking — the interviewer will respond with natural voice audio.
              </p>
              <p className="text-xs text-on-surface-variant/60">
                Target Role: <span className="text-primary font-bold">"{roadmap?.goal || 'Technical Specialization'}"</span> • 4 questions • Voice: {selectedVoiceInfo.icon} {selectedVoiceInfo.name}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={handleStart}
                disabled={starting}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {starting ? (
                  <><Loader2 size={18} className="animate-spin" /> Preparing Interview...</>
                ) : (
                  <><Phone size={18} /> Start Voice Interview</>
                )}
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {[
                { icon: Volume2, label: 'AI Voice Responses' },
                { icon: Mic, label: 'Speech-to-Text Input' },
                { icon: Sparkles, label: 'AI Scoring' },
                { icon: Award, label: '+500 XP Reward' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/10 text-[10px] font-bold text-on-surface-variant">
                  <Icon size={12} className="text-primary" /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─── Active Interview ──────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chat Panel */}
          <div className="lg:col-span-2 flex flex-col h-[65vh] bg-surface-container rounded-[2rem] border border-outline-variant/10 shadow-xl overflow-hidden relative">
            {/* Header Bar */}
            <div className="px-6 py-3.5 border-b border-outline-variant/10 bg-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  {isSpeaking && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isSpeaking ? 'bg-secondary' : 'bg-primary'}`} />
                </span>
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Radio size={14} className={isSpeaking ? 'text-secondary animate-pulse' : 'text-primary'} />
                  {isSpeaking ? 'Interviewer Speaking...' : isListening ? 'Listening to You...' : 'Live Interview Session'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {selectedVoiceInfo.icon} {selectedVoiceInfo.name}
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Q{activeInterview.status === 'completed' ? '✓' : (activeInterview.current_question_index + 1)} / 4
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {history.map((msg, index) => {
                const isAI = msg.role === 'assistant';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-3 max-w-[88%] ${isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isAI ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'}`}>
                      {isAI ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className="space-y-1.5">
                      <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                        isAI
                          ? 'bg-surface-container-high text-on-surface border border-outline-variant/5 rounded-tl-sm'
                          : 'bg-primary-container text-white rounded-tr-sm'
                      }`}>
                        {msg.content}
                      </div>
                      {/* Per-message speak button for AI messages */}
                      {isAI && voiceEnabled && (
                        <button
                          onClick={() => speakText(msg.content)}
                          disabled={isSpeaking}
                          className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant hover:text-primary uppercase tracking-wider transition-colors disabled:opacity-40"
                        >
                          <Volume2 size={10} /> {isSpeaking ? 'Speaking...' : 'Replay'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {sending && (
                <div className="flex gap-3 max-w-[85%] self-start">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Bot size={16} /></div>
                  <div className="p-3.5 rounded-2xl bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 rounded-tl-sm">
                    <Loader2 size={14} className="animate-spin text-primary" /> Analyzing your response...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {activeInterview.status !== 'completed' ? (
              <div className="p-4 border-t border-outline-variant/10 bg-surface-container-high space-y-2">
                {/* Voice transcript indicator */}
                {isListening && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error/5 border border-error/10">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error" />
                    </span>
                    <span className="text-[10px] font-bold text-error uppercase tracking-wider">Recording — Speak your answer</span>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/5 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-xs font-medium"
                    placeholder={isListening ? '🎤 Listening... speak now' : 'Type or click the mic to speak your answer...'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={sending}
                    required
                  />
                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={sending}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-md disabled:opacity-50 ${
                      isListening
                        ? 'bg-error text-white animate-pulse hover:bg-error/80'
                        : 'bg-surface-container border border-outline-variant/10 text-on-surface-variant hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  {/* Send Button */}
                  <button
                    type="submit"
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white hover:shadow-lg transition-all flex items-center justify-center flex-shrink-0 shadow-md disabled:opacity-50"
                    disabled={sending || !input.trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 border-t border-outline-variant/10 bg-surface-container-high text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl bg-primary text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mx-auto shadow-md"
                >
                  <RefreshCw size={14} /> Start New Interview
                </button>
              </div>
            )}
          </div>

          {/* ─── Sidebar: Speaking Indicator + Scorecard ─────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Voice Activity Visualizer */}
            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-lg space-y-4">
              <h4 className="font-headline font-bold text-sm text-on-surface flex items-center gap-2">
                <Radio size={16} className="text-primary" /> Voice Channel
              </h4>
              
              {/* Avatar + Status */}
              <div className="text-center space-y-3">
                <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-3xl transition-all ${
                  isSpeaking ? 'bg-secondary/10 border-2 border-secondary/30 scale-110' : isListening ? 'bg-error/10 border-2 border-error/30 scale-105' : 'bg-surface-container-high border border-outline-variant/10'
                }`}>
                  {isSpeaking ? selectedVoiceInfo.icon : isListening ? '🎙️' : '💼'}
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    {isSpeaking ? `${selectedVoiceInfo.name} is speaking` : isListening ? 'Listening to you...' : 'Waiting for input'}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {isSpeaking ? 'AI Interviewer' : isListening ? 'Your turn' : 'Type or use mic'}
                  </p>
                </div>

                {/* Audio wave animation */}
                {(isSpeaking || isListening) && (
                  <div className="flex items-center justify-center gap-1 h-8">
                    {[...Array(7)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-1 rounded-full ${isSpeaking ? 'bg-secondary' : 'bg-error'}`}
                        animate={{
                          height: [4, 12 + Math.random() * 16, 6, 20 + Math.random() * 8, 4],
                        }}
                        transition={{
                          duration: 0.8 + Math.random() * 0.4,
                          repeat: Infinity,
                          delay: i * 0.08,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Quick controls */}
              <div className="flex items-center justify-center gap-2">
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-[10px] font-bold flex items-center gap-1 hover:bg-error/20 transition-colors"
                  >
                    <VolumeX size={12} /> Stop
                  </button>
                )}
                {!isListening && !isSpeaking && activeInterview.status !== 'completed' && (
                  <button
                    onClick={startListening}
                    className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors uppercase tracking-wider"
                  >
                    <Mic size={12} /> Hold to Speak
                  </button>
                )}
              </div>
            </div>

            {/* Scorecard */}
            {activeInterview.status === 'completed' ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-xl space-y-5"
              >
                <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                  <Award size={18} className="text-secondary" /> Final Scorecard
                </h4>

                <div className="text-center p-5 bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">AI Evaluation Score</span>
                  <span className={`text-5xl font-black block ${
                    activeInterview.score >= 75 ? 'text-secondary' : activeInterview.score >= 50 ? 'text-tertiary' : 'text-error'
                  }`}>{activeInterview.score}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant block">/ 100</span>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">+500 XP Earned 🎉</span>
                </div>

                <div className="space-y-2 bg-surface-container-high p-4 rounded-xl border border-outline-variant/5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-widest block">Interviewer Feedback</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed italic">"{activeInterview.feedback}"</p>
                </div>

                <button
                  onClick={() => {
                    if (activeInterview.feedback && voiceEnabled) {
                      speakText(`Your score is ${activeInterview.score} out of 100. ${activeInterview.feedback}`);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors"
                >
                  <Volume2 size={14} /> Hear Feedback
                </button>
              </motion.div>
            ) : (
              <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 text-center space-y-3 shadow-lg">
                <VideoOff size={28} className="text-on-surface-variant/30 mx-auto" />
                <h4 className="font-headline font-bold text-base text-on-surface">Score Pending</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">Complete all 4 interview questions. The AI evaluator will compile your scorecard with voice feedback.</p>
                <div className="w-full bg-surface-container-high rounded-full h-2 mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${((activeInterview.current_question_index) / 4) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant">{activeInterview.current_question_index}/4 answered</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
